<?php
include_once 'includes/connectDB.php';
include_once 'includes/loginFunctions.php';
sec_session_start();

if (login_check() == false) {
    header('Location: ../login.php?error=1');
    exit;
}


header('Content-Type: application/json');

$accountID = $_SESSION['accountID'];
$aResult = array();

if( !isset($_POST['function']) ) {
    $aResult['error'] = 'No function name provided!'; }
else {
    switch($_POST['function']) {
        ///////////////////////////////////////////////////////////////////////////////////
        case 'dateHasRoute':
            if( !isset($_POST['date']) || $_POST['date'] == "" || $_POST['date'] == null ) {
                $aResult['error'] = 'No date submitted!';
            }
            elseif( is_array($_POST['date']) ) {
                $aResult['error'] = 'Multiple dates submitted!';
            }
            else {
                $aResult['result'] = dateHasRoute($accountID, $_POST['date']);
            }
            break;
        ///////////////////////////////////////////////////////////////////////////////////
        case 'getRouteID':
            if( !isset($_POST['date']) || $_POST['date'] == "" || $_POST['date'] == null ) {
                $aResult['error'] = 'No date submitted!';
            }
            elseif( is_array($_POST['date']) ) {
                $aResult['error'] = 'Multiple dates submitted!';
            }
            else {
                $aResult['result'] = getRouteID($accountID, $_POST['date']);
            }
            break;
        ///////////////////////////////////////////////////////////////////////////////////
        case 'saveRoute':
            if( !isset($_POST['date']) || $_POST['date'] == "" || $_POST['date'] == null ) {
                $aResult['error'] = 'No date submitted!';
            }
            if( !isset($_POST['route']) || $_POST['route'] == "" || $_POST['route'] == null ) {
                $aResult['error'] = 'No route submitted!';
            }
            elseif( is_array($_POST['date']) ) {
                $aResult['error'] = 'Multiple dates submitted!';
            }
            else {
                $aResult['result'] = saveRoute($accountID, $_POST['date'], $_POST['route']);
            }
            break;
        ///////////////////////////////////////////////////////////////////////////////////
        case 'loadRoute':
            if( !isset($_POST['date']) || $_POST['date'] == "" || $_POST['date'] == null ) {
                $aResult['error'] = 'No date submitted!';
            }
            elseif( is_array($_POST['date']) ) {
                $aResult['error'] = 'Multiple dates submitted!';
            }
            else {
                $aResult['result'] = loadRoute($accountID, $_POST['date']);
            }
            break;
        ///////////////////////////////////////////////////////////////////////////////////
        default:
            $aResult['error'] = 'Function '.$_POST['function'].' not found!';
            break;
    }
}

echo json_encode($aResult);


///////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////


function dateHasRoute($accountID, $date) {
    global $mysqli;
    global $aResult;

    if ($stmt = $mysqli->prepare("SELECT routeID FROM routes WHERE accountID = ? AND date = ?")) {
        $stmt->bind_param('is', $accountID, $date);
        $stmt->execute();
        $stmt->store_result();

        if (!$stmt) {
            $aResult['error'] = "Error querying routes table for date ".$date.". Error: " . $stmt->error;
            return false;
        }

        $nor = $stmt->num_rows;
        $stmt->close();
        if ($nor > 0) return true;
    }

    return false;
}


function getRouteID($accountID, $date) {
    global $mysqli;
    global $aResult;

    if ($stmt = $mysqli->prepare("SELECT routeID FROM routes WHERE accountID = ? AND date = ?")) {
        $stmt->bind_param('is', $accountID, $date);
        $stmt->execute();
        $stmt->store_result();

        if (!$stmt) {
            $aResult['error'] = "Error querying routes table for date ".$date.". Error: " . $stmt->error;
            return -1;
        }

        if ($stmt->num_rows > 0) {
            $stmt->bind_result($routeID);
            $stmt->fetch();
            $stmt->close();
            return $routeID;
        }
        $stmt->close();
    }
    return null;
}


function saveRoute($accountID, $date, $route) {
    global $mysqli;
    global $aResult;

    $routeID = getRouteID($accountID, $date);

    if ($routeID == null) {
        // add new route to route DB and obtain the assigned routeID
        if ($stmt = $mysqli->prepare("INSERT INTO routes (accountID, date) VALUES (?, ?)")) {
            $stmt->bind_param('is', $accountID, $date);
            $stmt->execute();
            $stmt->store_result();
            if (!$stmt) {
                $aResult['error'] = "Error adding route for ".$date.". Error: " . $stmt->error;
                $stmt->close();
                return false;
            }
            $stmt->close();
            $routeID = getRouteID($accountID, $date);

        }
    }
    else {
        // remove existing route stops with this routeID from table routestops
        if ($stmt = $mysqli->prepare("DELETE FROM routestops WHERE routeID = ?")) {
            $stmt->bind_param('i', $routeID);
            $stmt->execute();
            $stmt->store_result();
            if (!$stmt) {
                $aResult['error'] = "Error deleting existing rout stops for routeID ".$routeID.". Error: " . $stmt->error;
                $stmt->close();
                return false;
            }
            $stmt->close();
        }
    }

    // add new route stops to table routestops using routeID
    if ($stmt = $mysqli->prepare("INSERT INTO routestops (routeID, stopnumber, customerID, locked) VALUES (?,?,?,?)")) {
        for ($i = 0; $i < count($route); $i++) {
            $route[$i]['locked'] == "true"? $b = 1 : $b = 0;
            $stmt->bind_param('iiii', $routeID, $i, $route[$i]['customerID'], $b);
            $stmt->execute();
            if (!$stmt) {
                $aResult['error'] = "Error adding routestop for " . $date . ". Error: " . $stmt->error;
                $stmt->close();
                return false;
            }
        }
        $stmt->close();
    }

    return true;
}


function loadRoute($accountID, $date) {
    global $mysqli;
    global $aResult;

    $routeID = getRouteID($accountID, $date);

    if ($routeID != null) {
        // get route stops for this route
        if ($stmt = $mysqli->prepare("SELECT stopnumber, customerID, locked FROM routestops WHERE routeID = ? ORDER BY stopnumber")) {
            $stmt->bind_param('i', $routeID);
            $stmt->execute();
            $stmt->store_result();

            if (!$stmt) {
                $aResult['error'] = "Error querying routestops for routeID ".$routeID.". Error: " . $stmt->error;
                return false;
            }

            if ($stmt->num_rows > 0) {
                $stmt->bind_result($stopnumber, $customerID, $locked);
                $route = array();
                while ($stmt->fetch()) {
                    $stop['customerID'] = $customerID;
                    $stop['locked'] = $locked ? true : false;
                    array_push($route, $stop);
                }
                $stmt->close();
                return $route;
            }
            $stmt->close();
        }
    }

    return null;
}
