<?php
include_once 'connectDB.php';
include_once 'loginFunctions.php';
sec_session_start();

if (login_check() == false) {
    header('Location: ../login.php?error=1');
    exit;
}


$accountID = $_SESSION['accountID'];
$aResult = array();

if (isset($_POST['p'])) {
    // Sanitize and validate the data passed in
    $password = filter_input(INPUT_POST, 'p', FILTER_SANITIZE_STRING);
    if (strlen($password) != 128) {
        // The hashed pwd should be 128 characters long. If it's not, something really odd has happened
        $aResult['error'] = 'Invalid password configuration.';
    }
    else {
        // Create a random salt
        $random_salt = hash('sha512', uniqid(mt_rand(1, mt_getrandmax()), true));

        // Create salted password
        $password = hash('sha512', $password . $random_salt);

        // replace password in useraccount table for account with accountID
        if ($stmt = $mysqli->prepare("UPDATE useraccounts SET password = ?, salt = ? WHERE accountID = ?")) {
            $stmt->bind_param('ssi', $password, $random_salt, $accountID);

            // Execute the prepared query.
            if (! $stmt->execute()) {
                $aResult['error'] = 'Password could not be updated.';
            }
            else {
                // update login string
                $user_browser = $_SERVER['HTTP_USER_AGENT'];
                $_SESSION['login_string'] = hash('sha512', $password . $user_browser);

                $aResult['result'] = 'Password successfully changed.';
            }
        }
    }
}
else {
    $aResult['error'] = 'No password submitted.';
}

header('Content-Type: application/json');
echo json_encode($aResult);
