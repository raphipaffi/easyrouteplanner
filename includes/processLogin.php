<?php
include_once 'connectDB.php';
include_once 'loginFunctions.php';
sec_session_start();

if (isset($_POST['email'], $_POST['p'])) {
    if (login($_POST['email'], $_POST['p'], $_POST['autoLogin'])) header('Location: ../main.php');
    else header('Location: ../login.php?error=1');
}
else echo 'Invalid Request';
