<?php


function sec_session_start() {
    $session_name = 'session';

    // forces sessions to only use cookies
    if (ini_set('session.use_only_cookies', 1) === FALSE) {
        header("Location: ../error.php?err=Could not initiate a safe session (ini_set)");
        exit();
    }

    // Gets current cookies params.
    $cookieParams = session_get_cookie_params();

    // set cookie parameters
    if (strpos(getenv('SERVER_SOFTWARE'), 'Development') === false) $secure = true; // enforce SSL in production environment
    else $secure = false; // don't enforce SSL in development environment
    $httponly = true; // this stops JavaScript being able to access the session id.
    session_set_cookie_params($cookieParams["lifetime"], $cookieParams["path"], $cookieParams["domain"], $secure, $httponly);

    session_name($session_name);
    session_start();            // Start the PHP session
    session_regenerate_id();    // regenerate the session, delete the old one.
}


function login($email, $password, $autoLogin) {
    global $mysqli;

    // Using prepared statements means that SQL injection is not possible.
    if ($stmt = $mysqli->prepare("SELECT accountID, password, salt
        FROM useraccounts
        WHERE email = ?
        LIMIT 1")) {
        $stmt->bind_param('s', $email);
        $stmt->execute();
        $stmt->store_result();

        // get variables from result.
        $stmt->bind_result($accountID, $db_password, $salt);
        $stmt->fetch();

        // hash the password with the unique salt.
        $password = hash('sha512', $password . $salt);
        if ($stmt->num_rows == 1) {
            if (checkbrute($accountID, $mysqli) == true) {
                // Account is locked
                // Todo: Send an email to user saying their account is locked
                return false;
            } else {
                // Check if the password in the database matches the password the user submitted.
                if ($db_password == $password) {
                    $user_browser = $_SERVER['HTTP_USER_AGENT'];

                    // XSS protection as we might print this value
                    $accountID = preg_replace("/[^0-9]+/", "", $accountID);
                    $_SESSION['accountID'] = $accountID;

                    // XSS protection as we might print this value
//                    $username = preg_replace("/[^a-zA-Z0-9_\-]+/", "", $username);
                    $_SESSION['email'] = $email;
                    $_SESSION['login_string'] = hash('sha512', $password . $user_browser);

                    // create "remember me" cookie
                    if ($autoLogin) rememberMe($accountID);

                    // Login successful.
                    return true;
                } else {
                    // Password is not correct
                    $now = time();
                    $mysqli->query("INSERT INTO loginattempts(accountID, time) VALUES ('$accountID', '$now')");
                }
            }
        }
    }

    return false;
}


function rememberMe($accountID)
{
    global $mysqli;

    // create a random token
    $token = base64_encode(openssl_random_pseudo_bytes(24));

    // create a unique selector
    do {
        $selector = base64_encode(openssl_random_pseudo_bytes(9));
        $stmt = $mysqli->prepare("SELECT authID FROM auth_tokens WHERE selector = ?");
        $stmt->bind_param('s', $selector);
        $stmt->execute();
        $stmt->store_result();
    } while($stmt->num_rows > 0);
    $stmt->close();

    // create expire date
    $expires = new DateTime('now');
    $expires->add(new DateInterval('P14D'));

    // place selector, hashed token, accountID and expire date into database
    if ($stmt = $mysqli->prepare("INSERT INTO auth_tokens(selector, token, accountID, expires) VALUES (?, ?, ?, ?)")) {
        $stmt->bind_param('ssis', $selector, hash('sha512', $token), $accountID, $expires->format('Y-m-d H:i:s'));
        $stmt->execute();
        if ($stmt->errno != 0) {
            echo "Error adding login token to database. Error: " . $stmt->error;
            $stmt->close();
            return;
        }
        $stmt->close();
    }

    // Create auth cookie
    $cookieParams = session_get_cookie_params();
    $cookieLifetime = time() + 14 * 24 * 60 * 60; // cookie expires in 14 days
//    $cookieLifetime = 10 * 365 * 24 * 60 * 60; // cookie expires in ten years from session start
    if (strpos(getenv('SERVER_SOFTWARE'), 'Development') === false) $secure = true; // enforce SSL in production environment
    else $secure = false; // don't enforce SSL in development environment
    $httponly = true; // this stops JavaScript being able to access the session id.
    setcookie(
        'auth',
        $selector.':'.$token,
        $cookieLifetime,
        $cookieParams["path"],
        $cookieParams["domain"],
        $secure,
        $httponly
    );
}

function forgetMe() {
    global $mysqli;

    if (!empty($_COOKIE['auth'])) {
        $split = explode(':', $_COOKIE['auth']);
        if (count($split) !== 2) {
            echo "Badly formed auth cookie!";
            return;
        }
        list($selectorCO, $tokenCO) = $split;

        // remove auto-login entry from database  based on selector from cookie
        $stmt = $mysqli->prepare("DELETE FROM auth_tokens WHERE selector = ?");
        $stmt->bind_param('s', $selectorCO);
        $stmt->execute();
        if ($stmt->errno != 0) {
            echo "Error deleting auto-login entry from database. Error: " . $stmt->error;
        }
        $stmt->close();

        $params = session_get_cookie_params();

        // delete the auto-login cookie
        setcookie(
            'auth',
            '',
            time() - 42000,
            $params["path"],
            $params["domain"],
            $params["secure"],
            $params["httponly"]);
    }
}

function checkbrute($accountID) {
    global $mysqli;

    // Get timestamp of current time
    $now = time();

    // All login attempts are counted from the past 2 hours.
    $valid_attempts = $now - (2 * 60 * 60);

    if ($stmt = $mysqli->prepare("SELECT time
                                  FROM loginattempts
                                  WHERE accountID = ?
                                  AND time > '$valid_attempts'")) {
        $stmt->bind_param('i', $accountID);

        // Execute the prepared query.
        $stmt->execute();
        $stmt->store_result();

        // If there have been more than 5 failed logins
        if ($stmt->num_rows > 5) return true;
    }

    return false;
}


function login_check() {
    global $mysqli;

    // check if auth cookie exists (if valid cookie is found, $accountID is set after call to isAutoLoginSet())
    $autoLogin = false;
    if (!isset($_SESSION['accountID'])) $autoLogin = isAutoLoginSet();

    // Check if all session variables are set
    if (isset($_SESSION['accountID'])) {
        // Get the user-agent string of the user.
        $user_browser = $_SERVER['HTTP_USER_AGENT'];

        if ($stmt = $mysqli->prepare("SELECT email, password FROM useraccounts WHERE accountID = ? LIMIT 1")) {
            $stmt->bind_param('i', $_SESSION['accountID']);
            $stmt->execute();
            $stmt->store_result();

            if ($stmt->num_rows == 1) {
                $stmt->bind_result($email, $password);
                $stmt->fetch();
                $login_stringDB = hash('sha512', $password . $user_browser);

                if (isset($_SESSION['login_string']) && $_SESSION['login_string'] == $login_stringDB) {
                    // session still valid => user is still logged in
                    return true;
                }
                else if ($autoLogin) {
                    // user has a valid autoLogin cookie on his machine => user has been logged in automatically
                    $_SESSION['email'] = $email;
                    $_SESSION['login_string'] = $login_stringDB;
                    return true;
                }
            }
        }
    }
    return false;
}


function isAutoLoginSet()
{
    global $mysqli;

    if (!empty($_COOKIE['auth'])) {
        $split = explode(':', $_COOKIE['auth']);
        if (count($split) !== 2) {
            echo "Badly formed auth cookie!";
            return false;
        }
        list($selectorCO, $tokenCO) = $split;

        // AND expires <= CURDATE()
        if ($stmt = $mysqli->prepare("SELECT authID, token, accountID FROM auth_tokens WHERE selector = ?")) {
            $stmt->bind_param('s', $selectorCO);
            $stmt->execute();
            $stmt->store_result();
            if ($stmt->errno != 0) {
                echo "Error fetching login token from database. Error: " . $stmt->error;
                $stmt->close();
                return false;
            }
            if ($stmt->num_rows > 0) {
                $stmt->bind_result($authID, $tokenDB, $accountID);
                $stmt->fetch();
            }
            $stmt->close();
        }

        if (isset($authID) && isset($tokenDB) && isset($accountID)) {
            if ($tokenDB == hash('sha512', $tokenCO)) {
                // Privilege escalation - get a new random session ID
                session_regenerate_id(true);

                // remove this token from DB
                $stmt = $mysqli->prepare("DELETE FROM auth_tokens WHERE authID = ?");
                $stmt->bind_param('i', $authID);
                $stmt->execute();
                if ($stmt->errno != 0) {
                    echo "Error deleting login token from database. Error: " . $stmt->error;
                    $stmt->close();
                    return false;
                }
                $stmt->close();

                $_SESSION['accountID'] = $accountID;

                // generate a new token
                rememberMe($accountID);
                return true;
            }
        }
        echo "Invalid auth cookie!";
    }
    return false;
}


function esc_url($url) {

    if ('' == $url) {
        return $url;
    }

    $url = preg_replace('|[^a-z0-9-~+_.?#=!&;,/:%@$\|*\'()\\x80-\\xff]|i', '', $url);

    $strip = array('%0d', '%0a', '%0D', '%0A');
    $url = (string) $url;

    $count = 1;
    while ($count) {
        $url = str_replace($strip, '', $url, $count);
    }

    $url = str_replace(';//', '://', $url);

    $url = htmlentities($url);

    $url = str_replace('&amp;', '&#038;', $url);
    $url = str_replace("'", '&#039;', $url);

    if ($url[0] !== '/') {
        // We're only interested in relative links from $_SERVER['PHP_SELF']
        return '';
    } else {
        return $url;
    }
}
