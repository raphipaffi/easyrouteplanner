<?php
include_once 'connectDB.php';
include_once 'loginFunctions.php';
sec_session_start();

// remove auto-login cookie
forgetMe();

// get parameters of session cookie
$params = session_get_cookie_params();

// Delete the session cookie.
setcookie(session_name(),
    '',
    time() - 42000,
    $params["path"],
    $params["domain"],
    $params["secure"],
    $params["httponly"]);

// Unset all session values
$_SESSION = array();

// Destroy session
session_destroy();
header('Location: ../login.php');
