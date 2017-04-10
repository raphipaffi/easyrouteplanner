<?php
include_once 'includes/register.inc.php';
include_once 'includes/loginFunctions.php';
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
            $("#email").css({width: "200px"});
            $("#password").css({width: "200px"}).on('keydown', function(e) { if (e.keyCode === 13) $('#registerButton').click(); });
            $("#confirmpwd").css({width: "200px"}).on('keydown', function(e) { if (e.keyCode === 13) $('#registerButton').click(); });
            $("#registerButton").button().click( function() {
                var form = document.getElementById("registration_form");
                regformhash(form, form.email, form.password, form.confirmpwd);
            });
        }
    </script>
</head>

<body onload="initialize()">

<div id="RegisterArea" style="display: table; width: 100%; height: 100%; overflow: hidden;">
    <div style="display: table-cell; vertical-align: middle;">
        <div align="center" >

            <h1>Registrierung</h1>

            Das Passwort muss folgende Bedingungen erf&uuml;llen:
            <ul>
                <li>Mindestens 6 Zeichen lang</li>
                <li>Mindestens ein Grossbuchstabe (A..Z)</li>
                <li>Mindestens ein Kleinbuchstabe (a..z)</li>
                <li>Mindestens eine Zahl (0..9)</li>
            </ul>

            <form action="<?php echo esc_url($_SERVER['PHP_SELF']); ?>" method="post" name="registration_form" id="registration_form" autocomplete="off">
                <table>
                    <tr>
                        <td><label for="email">Email</label></td>
                        <td><input type="email" name="email" id="email" autocomplete="off"/></td>
                    </tr>

                    <tr>
                        <td><label for="password">Passwort</label></td>
                        <td><input type="password" name="password" id="password" autocomplete="off"/></td>
                    </tr>

                    <tr>
                        <td><label for="confirmpwd">Passwort best&auml;tigen</label></td>
                        <td><input type="password" name="confirmpwd" id="confirmpwd" autocomplete="off"/></td>
                    </tr>
                </table>

                <div style="margin: 1em;" >
                    <input type="button" id="registerButton" value="Registrieren"/>
                </div>
            </form>

            <p>Zur&uuml;ck zum <a href="login.php">Login</a>.</p>

            <?php if (!empty($error_msg)) { echo $error_msg; } ?>

        </div>
    </div>
</div>

</body>
</html>
