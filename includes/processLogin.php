<?php
include_once 'connectDB.php';
include_once 'loginFunctions.php';
sec_session_start();

if (isset($_POST['email'], $_POST['p'])) {
    if (login($_POST['email'], $_POST['p'], $_POST['autoLogin'])) {
        header('Location: ../main.php');
    }
    else {
        $message = urlencode('Anmeldung fehlgeschlagen.<br>Bitte überprüfen Sie Emailadresse und Passwort.');
        header('Location: ../login.php?error=' . $message);
    }
}
else echo 'Invalid Request';
