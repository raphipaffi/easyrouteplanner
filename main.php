<?php
include_once 'includes/connectDB.php';
include_once 'includes/loginFunctions.php';
sec_session_start();

if (login_check() == false) {
    header('Location: ../login.php');
    exit;
}
?>


<!DOCTYPE html>
<html>
<head>
    <title>Easy Route Planner</title>

    <meta charset="utf-8">

    <!-- android -->
    <link rel="shortcut icon" sizes="196x196" href="/img/EasyRoutePlannerIcon196.png">
    <!-- iOS -->
    <link rel="apple-touch-icon" href="/img/EasyRoutePlannerIcon76.png">
    <link rel="apple-touch-icon" sizes="76x76" href="/img/EasyRoutePlannerIcon76.png">
    <link rel="apple-touch-icon" sizes="120x120" href="/img/EasyRoutePlannerIcon120.png">
    <link rel="apple-touch-icon" sizes="152x152" href="/img/EasyRoutePlannerIcon152.png">

    <meta name="viewport" content="width=device-width,user-scalable=no,initial-scale=1.0,maximum-scale=1.0,minimum-scale=1.0">

    <link rel="stylesheet" href="https://code.jquery.com/ui/1.10.3/themes/smoothness/jquery-ui.css" />
    <link rel="stylesheet" href="css/jquery.datetimepicker.css" />
    <link rel="stylesheet" href="css/mapmagic.css">

    <script type="text/javascript" src="https://code.jquery.com/jquery-1.9.1.js"></script>
    <script type="text/javascript" src="https://code.jquery.com/ui/1.10.3/jquery-ui.js"></script>
<!--    <script type="text/javascript" src="https://maps.google.com/maps/api/js"></script>-->
    <script type="text/javascript" src="https://maps.googleapis.com/maps/api/js?key=<?php
        if (strpos(getenv('SERVER_SOFTWARE'), 'Development') === false)
            echo getenv('PRODUCTION_GOOGLE_API_KEY');
        else
            echo getenv('DEVELOPMENT_GOOGLE_API_KEY');
        ?>" ></script>
    <script type="text/javascript" src="https://apis.google.com/js/client.js"></script> <!-- need to access Google Calendar -->
<!--    <script type="text/javascript" src="js/preventoverscroll.js"></script>-->
    <script type="text/javascript" src="js/modernizr-latest.js"></script>
    <script type="text/javascript" src="js/jquery.ics-0.3.js"></script>
    <script type="text/javascript" src="js/markerwithlabel.js"></script>
    <script type="text/javascript" src="js/ddslick.js"></script>
    <script type="text/javascript" src="js/mapmagic.js"></script>
    <script type="text/javascript" src="js/customermanager.js"></script>
    <script type="text/javascript" src="js/routemanager.js"></script>
    <script type="text/javascript" src="js/settingsmanager.js"></script>
    <script type="text/javascript" src="js/accountmanager.js"></script>
    <script type="text/javascript" src="js/routecalculation.js"></script>
    <script type="text/javascript" src="js/jquery.ba-resize.js"></script>
    <script type="text/javascript" src="js/editablegrid.js"></script>
    <script type="text/javascript" src="js/editablegrid_charts.js"></script>
    <script type="text/javascript" src="js/editablegrid_editors.js"></script>
    <script type="text/javascript" src="js/editablegrid_renderers.js"></script>
    <script type="text/javascript" src="js/editablegrid_utils.js"></script>
    <script type="text/javascript" src="js/editablegrid_validators.js"></script>
    <script type="text/javascript" src="js/sha512.js"></script>
    <script type="text/javascript" src="js/forms.js"></script>
    <script type="text/javascript" src="js/FileSaver.js"></script>
    <script type="text/javascript" src="js/jquery.wordexport.js"></script>
    <script type="text/javascript" src="js/jquery.datetimepicker.js"></script>
<!--    <script type="text/javascript" src="js/oms.min.js"></script>-->
<!--    <script type="text/javascript" src="js/BpTspSolver.js"></script>-->
<!--    <script type="text/javascript" src="js/tsp.js"></script>-->
</head>


<!--<body onload="initialize()">-->
<body>

<div id="tabs">
    <ul>
        <li id="tab-planner-button"><a href="#tab-planner">Planer</a></li>
        <li><a href="#tab-routes">Routen</a></li>
        <li><a href="#tab-customers">Kunden</a></li>
        <li><a href="#tab-settings">Settings</a></li>
        <li><a href="#tab-account">Account</a></li>
    </ul>

    <!-- tab with all the planning functionality -->
    <div id="tab-planner">
        <div id="wrapperDiv">
            <div id="mapDiv"></div>

            <div id="progressBarDiv">
                <div id="progressBarText">Marker werden platziert</div>
                <div id="progressBar"></div>
            </div>
        </div>

        <div id="controlBarDiv">
            <div id="plannerDate"></div>

            <div id="plannerButtons">
            <button class="routeButton" id="deleteRoute" title="Neue Route planen"><img src="img/iconNew.png"></button>
            <button class="routeButton" id="calcRoute" title="Route optimieren und Fahrzeiten berechnen"><img src="img/iconCalc.png"></button>
            <button class="routeButton" id="saveRoute" title="Route f&uuml;r das gew&auml;hlte Datum speichern"><img src="img/iconSave.png"></button>
            <button class="routeButton" id="loadRoute" title="F&uuml;r das gew&auml;hlte Datum die gespeicherte Route laden"><img src="img/iconOpen.png"></button>
            <button class="routeButton" id="exportRoute" title="Word Datei mit optimierter Route exportieren"><img src="img/iconWord.png"></button>
            </div>

            <div id="listStart"></div>
            <ol id="addressListGUI"></ol>
            <div id="routingResult"></div>
        </div>
    </div>

    <!-- tab with the planned routes -->
    <div id="tab-routes">
        <div class="tableSearch">
            <label for="routeDate">Datum der Route:</label>
            <input type="date" id="routeDate"/>
        </div>

        <div id="routeMessageArea" style="display: table; width: 100%; height: 30%; overflow: hidden;">
            <div style="display: table-cell; vertical-align: middle;">
                <p id="routeMessage" align="center"></p>
            </div>
        </div>

        <div id="tableOfRoutestops"></div>
    </div>

    <!-- tab with the customer data in table format -->
    <div id="tab-customers">
        <div class="tableSearch">
            <label for="customerFilter">Suche:</label>
            <input type="text" id="customerFilter" size="30"/>
        </div>

        <div id="paginator"></div>

        <div id="tableOfCustomers"></div>
    </div>


    <!-- tab with general settings -->
    <div id="tab-settings">
        <div id="settingsWrapper">
<!--         align="center">-->

            <h2>Kundengruppen</h2>
            <p>Sie k&ouml;nnen ihre Kunden verschiedenen Gruppen zuordnen,
                die sie auf der Karte mit unterschiedlichen Markern anzeigen.
                Dadurch behalten sie auch bei einer gro&szlig;en Kundenzahl
                den &Uuml;berblick.</p>
            <table id="tableOfCustomerGroups"></table>
            <button id="addNewCustomerGroup">Neue Gruppe</button>

            <h2>Standardmarker</h2>
            <table>
                <tr>
                    <td><p>Marker f&uuml;r Kunden, die keiner Gruppe zugeordnet sind:</p></td>
                    <td><div id="defaultMarkerDiv"></div></td>
                </tr>
            </table>

            <h2>Kalender mit Kundenterminen</h2>
            <p>Sie k&ouml;nnen Kundentermine automatisch aus ihrem Terminkalender auslesen.
                Geben sie dazu Ihren Terminkalender frei und kopieren den Link in das Feld unten.
                Der Link muss mit <i>http://</i> oder <i>https://</i> beginnen und auf iCAL Daten verweisen.<br/>
                <small>Bitte beachten sie: Wenn sie einen Terminkalender angeben, k&ouml;nnen sie Termine
                nicht mehr manuell in Easy Route Planner bearbeiten. Die Eingabe erfolgt dann ausschliesslich
                &uuml;ber ihren Terminkalender.</small>
            </p>
            <label for="calendarLink">Kalenderlink:</label>
            <input type="text" id="calendarLink" size="40"/>
            <button id="saveCalendarLink">Speichern</button>
            <div id="calendarDiv"></div>
        </div>
    </div>


    <!-- tab with account settings -->
    <div id="tab-account" align="center">
        <form name="changePassword_form" id="changePassword_form" autocomplete="off">
            <table>
                <tr>
                    <td align="right"><label for="email">Angemeldet als</label></td>
                    <td><input type="text" name="email" id="email" value="<?php echo $_SESSION['email'] ?>" disabled/></td>
                    <td></td>
                </tr>

                <tr>
                    <td></td>
                    <td style="padding-bottom: 1em;" align="right">
                        <input type="button" id="logoutButton" value="Abmelden"/>
                    </td>
                    <td></td>
                </tr>

                <tr>
                    <td align="right"><label for="newPassword">Neues Passwort</label></td>
                    <td><input type="password" name="newPassword" id="newPassword" autocomplete="off"/></td>
                    <td></td>
                </tr>

                <tr>
                    <td align="right"><label for="confirmPassword">Passwort best&auml;tigen</label></td>
                    <td><input type="password" name="confirmPassword" id="confirmPassword" autocomplete="off"/></td>
                    <td></td>
                </tr>

                <tr>
                    <td></td>
                    <td align="right">
                        <input type="button" id="changePasswordButton" value="Passwort &auml;ndern"/>
                    </td>
                    <td></td>
                </tr>
            </table>
        </form>
    </div>

</div>

</body>
</html>
