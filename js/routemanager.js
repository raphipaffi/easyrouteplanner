
var tableOfRoutestops;
var routeMetadata;
var selectedRoute = [];

function initRouteManager() {
    // init route date field
    var today = new Date();
    today = today.getFullYear() + "-" + ("0"+(today.getMonth()+1)).slice(-2) + "-" + ("0"+today.getDate()).slice(-2);
    var routeDate = $('#routeDate');
    routeDate.val(today);
    routeDate.change(loadRouteForRouteTab);
    if (!Modernizr.inputtypes.date) {
        routeDate.datetimepicker({
            format: 'Y-m-d',
            timepicker: false,
            closeOnDateSelect: true,
            dayOfWeekStart : 1,
            lang: 'de'
        });
    }

    // init meta data for route table
    routeMetadata = [];
    routeMetadata.push({ name: "stopID",      label: "Nr.",     datatype: "integer", editable: false});
    routeMetadata.push({ name: "cIndex",      label: "Ziel",    datatype: "html",    editable: false});
    routeMetadata.push({ name: "visit",       label: "Zuletzt besucht", datatype: "date",    editable: true});
    routeMetadata.push({ name: "appointment", label: "N\xE4chster Termin",  datatype: "datetime", editable: (calendarLink == null)});
    routeMetadata.push({ name: "group",       label: "Gruppe",  datatype: "string",  editable: true});
    routeMetadata.push({ name: "hint",        label: "Kommentar", datatype: "string",  editable: true});

    // create grid object
    tableOfRoutestops = new EditableGrid("RouteDataTable", {
        editmode: "static",
        enableSort: false,
        modelChanged: updateCustomerInDBFromRouteManager
    });

    // create initial route table in grid object
    loadRouteForRouteTab();
}


function putRouteIntoRouteTab(route, dateString) {
    var messageArea = $('#routeMessageArea');
    var tableElement = $('#tableOfRoutestops');
    if (route == null) {
        tableElement.hide();
        $('#routeMessage').html("F\xFCr das Datum " + dateString + " wurde noch keine Route gespeichert.");
        messageArea.show();
        return;
    }
    messageArea.hide();

    // define groups
    routeMetadata[4].values = {};
    routeMetadata[4].values["null"] = " ";
    $.each(customerGroups, function(k, group) {
        routeMetadata[4].values[group.groupID] = group.description;
    });

    // define hints
    // routeMetadata[5].values = {
    //     "null":    " ",
    //     "SD":      "SD",
    //     "kein SD": "kein SD"
    // };

    var data = [];
    selectedRoute = [];

    // enter route stops retrieved from DB into table data
    for (var i = 0; i < route.length; i++) {
        // search customerID in customers
        $.each(customers, function(k, customer) {
            if (customer.customerID == route[i].customerID) {
                selectedRoute.push(customer);

                data.push({id: i+1, values: {
                    "stopID":      i+1,
                    "cIndex":      k,
                    "visit":       customer.visit? customer.visit : "",
                    "appointment": customer.appointment? customer.appointment : "",
                    "group":       customer.groupID,
                    "hint":        (customer.hint != null? customer.hint : "")}
                });

                return false; // break loop over customers
            }
        });
    }

    tableOfRoutestops.load({"metadata": routeMetadata, "data": data});

    // create renderer for button that triggers Google maps navigation
    tableOfRoutestops.setCellRenderer("cIndex", new CellRenderer({render: function(cell, value) {
        var cInd = tableOfRoutestops.getRowValues(cell.rowIndex).cIndex;
        var name = customers[cInd].name;
        var address = customers[cInd].address;
        var phone = customers[cInd].phone? customers[cInd].phone : "";

        cell.innerHTML =
            "<button class=\"routePointButtonClass\" " +
            "style=\"width: 100%; min-height: 44px; margin: 0; white-space: normal;\" " +
            "onclick=\"navigateToAddress('"+address+"')\">" + name + "<br>" + address + "<br>" + phone +
            "</button>";
    }}));

    tableOfRoutestops.renderGrid("tableOfRoutestops", "editgrid");
    $('.routePointButtonClass').button();
    tableElement.show();
}


function navigateToAddress(address) {
    var link = "https://maps.google.com/maps?'saddr=current+location'&daddr=" + encodeURIComponent(address);
    window.open(link);
}


function saveRoute() {
	if (waypointList.length == 0) {
		alert("Die aktuelle Route ist noch leer.\n\nKlicken Sie Marker auf der Karte und w\xE4hlen 'Besuchen', um Routenpunkte hinzuzuf\xFCgen.");
		return;
	}

    // are all waypoints customers?
    var supported = true;
    $.each(waypointList, function(k, customer) {
        if (typeof customer.customerID === 'undefined') {
            supported = false;
            return false;
        }
    });

    if (!supported) {
        alert("Die Route enth\xE4lt Wegpunkte, die keine Kunden sind.\nAktuell k\xF6nnen nur Routen mit Kunden gespeichert werden.");
        return;
    }

    // get currently selected date
    var dateString = $('#plannerDate').val();

    // check if there is already a route in the DB for this date
    $.post("accessRoutes.php", {function: "dateHasRoute", date: dateString}, function(retVal) {
        if('error' in retVal) { alert(retVal.error); }
        else {
            var routeExists = JSON.parse(retVal.result);
            if (routeExists) {
                if (!confirm("F\xFCr dieses Datum ist schon eine Route gespeichert.\nWollen sie die aktuell gespeicherte Route \xFCberschreiben?"))
                    return;
            }
            // either there is no route for the selected date in the DB or the user decided to override
            saveRouteInDB(dateString);
        }
    });
}


function saveRouteInDB(dateString) {
    $.post("accessRoutes.php", {function: "saveRoute", date: dateString, route: waypointList}, function(retVal) {
        if('error' in retVal) { alert(retVal.error); }
        else {
            var success = JSON.parse(retVal.result);
            if (success) { alert("Die Route f\xFCr das Datum " + dateString + " wurde gespeichert."); }
        }
    });
}

function loadRouteForPlannerTab() {
    var dateString = $('#plannerDate').val();
    if (dateString != "" && dateString != null)
        loadRoute(dateString, putRouteIntoPlannerTab);
}

function loadRouteForRouteTab() {
    var dateString = $('#routeDate').val();
    if (dateString != "" && dateString != null)
        loadRoute(dateString, putRouteIntoRouteTab);
}

function loadRoute(dateString, callback) {
    // load route from DB
    $.post("accessRoutes.php", {function: "loadRoute", date: dateString}, function(retVal) {
        if('error' in retVal) { alert(retVal.error); }
        else { callback(retVal.result, dateString); }
    });
}

function putRouteIntoPlannerTab(route, dateString) {
    if (route == null) {
        alert("Es wurde noch keine Route f\xFCr das Datum " + dateString + " gespeichert.");
        return;
    }

    // clean up current route
    deleteWaypointList();

    // copy route stops retrieved from DB to list of waypoints
    for (var i = 0; i < route.length; i++) {
        // search customerID in customers
        $.each(customers, function(k, customer) {
            if (customer.customerID == route[i].customerID) {
                customer.locked = route[i].locked;
                waypointList.push(customer);
            }
        });
    }

    // update address list in GUI
    updateWaypointListGUI();
}
