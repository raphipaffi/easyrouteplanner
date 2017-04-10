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
        case 'fetchAccountSettings':
            fetchAccountSettings($accountID);
            break;
        ///////////////////////////////////////////////////////////////////////////////////
        case 'fetchDefaultMarkerIcon':
            $aResult['result'] = fetchDefaultMarkerIcon($accountID);
            break;
        ///////////////////////////////////////////////////////////////////////////////////
        case 'updateDefaultMarkerIcon':
            if( !isset($_POST['iconIndex']) || $_POST['iconIndex'] == "" || $_POST['iconIndex'] == null ) {
                $aResult['error'] = 'No icon index submitted!';
            }
            else {
                $aResult['result'] = updateDefaultMarkerIcon($accountID, $_POST['iconIndex']);
            }
            break;
        ///////////////////////////////////////////////////////////////////////////////////
        case 'updateCalendarLink':
            if( !isset($_POST['link'])) {
                $aResult['error'] = 'No link submitted!';
            }
            else {
                $aResult['result'] = updateCalendarLink($accountID, $_POST['link']);
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

function fetchAccountSettings($accountID)
{
    global $mysqli;
    global $aResult;

    if ($stmt = $mysqli->prepare("SELECT defaultmarkericon, calendarlink FROM useraccounts WHERE accountID = ?")) {
        $stmt->bind_param('i', $accountID);
        $stmt->execute();
        $stmt->store_result();

        if ($stmt->num_rows > 0) {
            $stmt->bind_result($defaultmarkericon, $calendarlink);
            $stmt->fetch();
            $stmt->close();

            $aResult['result'] = Array();
            $aResult['result']['defaultMarkerIcon'] = $defaultmarkericon;
            $aResult['result']['calendarLink'] = $calendarlink;
            return;
        }
    }

    $aResult['error'] = "Something went wrong while reading account settings. Error: " . $stmt->error;
    return;
}

function fetchDefaultMarkerIcon($accountID)
{
    global $mysqli;
    global $aResult;

    if ($stmt = $mysqli->prepare("SELECT defaultmarkericon FROM useraccounts WHERE accountID = ?")) {
        $stmt->bind_param('i', $accountID);
        $stmt->execute();
        $stmt->store_result();

        if ($stmt->num_rows > 0) {
            $stmt->bind_result($defaultmarkericon);
            $stmt->fetch();
            $stmt->close();
            return $defaultmarkericon;
        }
    }

    return null;
}


function updateDefaultMarkerIcon($accountID, $index) {
    global $mysqli;
    global $aResult;

    if ($stmt = $mysqli->prepare("UPDATE useraccounts SET defaultmarkericon = ? WHERE accountID = ?")) {
        $stmt->bind_param('ii', $index, $accountID);
        $stmt->execute();
        $stmt->store_result();
        if (!$stmt) {
            $aResult['error'] = "Error updating default marker icon. Error: " . $stmt->error;
            return false;
        }
        $stmt->close();
    }

    return true;
}


function updateCalendarLink($accountID, $link) {
    global $mysqli;
    global $aResult;

    if ($link == "") $link = null;

    if ($stmt = $mysqli->prepare("UPDATE useraccounts SET calendarlink = ? WHERE accountID = ?")) {
        $stmt->bind_param('si', $link, $accountID);
        $stmt->execute();
        $stmt->store_result();
        if (!$stmt) {
            $aResult['error'] = "Error updating calendar link. Error: " . $stmt->error;
            return false;
        }
        $stmt->close();
    }

    return true;
}
