<?php
include_once 'connectDB.php';
include_once 'loginFunctions.php';
sec_session_start();

if (login_check() == false) {
    header('Location: ../login.php?error=1');
    exit;
}

//header('Content-type: application/json');
$url = $_GET['url'];
$data = file_get_contents($url);
echo $data;
