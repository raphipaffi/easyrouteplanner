<?php
include_once 'includes/connectDB.php';
include_once 'includes/loginFunctions.php';
sec_session_start();

if (login_check()) {
    header('Location: ../main.php');
    exit;
}
?>

<!DOCTYPE html>
<html>

<head>
    <title>Easy Route Planner</title>

    <!-- android -->
    <link rel="shortcut icon" sizes="196x196" href="/img/EasyRoutePlannerIcon196.png">
    <!-- iOS -->
    <link rel="apple-touch-icon" href="/img/EasyRoutePlannerIcon76.png">
    <link rel="apple-touch-icon" sizes="76x76" href="/img/EasyRoutePlannerIcon76.png">
    <link rel="apple-touch-icon" sizes="120x120" href="/img/EasyRoutePlannerIcon120.png">
    <link rel="apple-touch-icon" sizes="152x152" href="/img/EasyRoutePlannerIcon152.png">

    <meta name="viewport" content="width=device-width,user-scalable=no,initial-scale=1.0,maximum-scale=1.0,minimum-scale=1.0">

    <link rel="stylesheet" href="https://code.jquery.com/ui/1.10.3/themes/smoothness/jquery-ui.css" />
    <link rel="stylesheet" href="css/mapmagic.css">

    <script type="text/javascript" src="https://code.jquery.com/jquery-1.9.1.js"></script>
    <script type="text/javascript" src="https://code.jquery.com/ui/1.10.3/jquery-ui.js"></script>
    <script type="text/JavaScript" src="js/sha512.js"></script>
    <script type="text/JavaScript" src="js/forms.js"></script>

    <script type="text/JavaScript">
        function initialize() {
            $("#password").on('keydown', function(e) { if (e.keyCode === 13) $('#loginButton').click(); });
            $("#loginButton").button().click( function() { formhash(this.form, this.form.password); } );
        }
    </script>
</head>


<body onload="initialize()">

<div id="LoginArea" style="display: table; width: 100%; height: 100%; overflow: hidden;">
    <div style="display: table-cell; vertical-align: middle;">
        <div align="center">

            <p class="error" align="center">
            <?php if (isset($_GET['error'])) { echo "Fehler beim Login!"; } ?>
            </p>

            <form action="includes/processLogin.php" method="post" name="login_form" id="login_form">
                <table>
                    <tr>
                        <td><label for="email">Email</label></td>
                        <td><input type="email" name="email" id="email"/></td>
                    </tr>

                    <tr>
                        <td><label for="password">Passwort</label></td>
                        <td><input type="password" name="password" id="password"/></td>
                    </tr>
                </table>

                <label for="autoLogin">Auf diesem Ger&auml;t eingeloggt bleiben?</label>
                <input type="checkbox" name="autoLogin" id="autoLogin"/><br>

                <div style="margin: 1em;" >
                    <input type="button" id="loginButton" value="Login"/>
                </div>

            </form>

            <p>Falls Sie noch keinen Account besitzen, k&ouml;nnen Sie sich hier <a href='register.php'>registrieren</a>.</p>

        </div>
    </div>
</div>

</body>

</html>
