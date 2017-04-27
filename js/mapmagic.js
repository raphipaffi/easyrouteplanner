// tools for map
var map;
var mapScaled = false;
var oms; // OverlappingMarkerSpiderfier

// tools for map markers
var geocoder;
var nextAddress = 0;
var delay = 100;
var infoWindow = new google.maps.InfoWindow();
var markerBounds = new google.maps.LatLngBounds();
var defaultMarkerIconIndex = 11;
var calendarLink = null;
var appointmentIcon = 'img/white_big_ns_T.png';
var homeIcon = 'img/home.png';
var markerIcons = {
    "0": "img/green_dot_ns.png",
    "1": "img/yellow_dot_ns.png",
    "2": "img/brown_dot_ns.png",
    "3": "img/lightblue_dot_ns.png",
    "4": "img/blue_dot_ns.png",
    "5": "img/red_dot_ns.png",
    "6": "img/purple_dot_ns.png",
    "7": "img/teel_dot_ns.png",
    "8": "img/orange_dot_ns.png",
    "9": "img/grey_dot_ns.png",
    "10": "img/black_dot_ns.png",
    "11": "img/white_dot_ns.png",
    "12": "img/green_big_ns.png",
    "13": "img/yellow_big_ns.png",
    "14": "img/brown_big_ns.png",
    "15": "img/lightblue_big_ns.png",
    "16": "img/blue_big_ns.png",
    "17": "img/red_big_ns.png",
    "18": "img/purple_big_ns.png",
    "19": "img/teel_big_ns.png",
    "20": "img/orange_big_ns.png",
    "21": "img/grey_big_ns.png",
    "22": "img/black_big_ns.png",
    "23": "img/white_big_ns.png",
    "24": "img/green_star_ns.png",
    "25": "img/yellow_star_ns.png",
    "26": "img/brown_star_ns.png",
    "27": "img/lightblue_star_ns.png",
    "28": "img/blue_star_ns.png",
    "29": "img/red_star_ns.png",
    "30": "img/purple_star_ns.png",
    "31": "img/teel_star_ns.png",
    "32": "img/orange_star_ns.png",
    "33": "img/grey_star_ns.png",
    "34": "img/black_star_ns.png",
    "35": "img/white_star_ns.png"
};

// local variables that hold the data from the database (markerList is filled by createMarkers())
var customers = [];
var customerGroups = {};
var markerList = {};

// tools to hold currently planned route
var waypointList = [];
var waypointIndexList = [];
var insertIndex = -1;

// other  tools
var startTime, endTime;

$(document).ready(initialize);

function initialize() {
    // init tabs
    $("#tabs").tabs({
        heightStyle: "fill",
        activate: function(e, ui) {
            localStorage.selectedTab = ui.newPanel.index()-1;

            if (ui.newPanel.selector == "#tab-planner") {
                google.maps.event.trigger(map, "resize");
                if (!mapScaled) {
                    map.fitBounds(markerBounds);
                    mapScaled = true;
                }
                newDateSelected();
                updateWaypointListGUI();
            }
            else if (ui.newPanel.selector == "#tab-routes") {
                loadRouteForRouteTab();
            }
            else if (ui.newPanel.selector == "#tab-customers") {
                updateCustomerTable();
            }
        }
    });
    $("body").bind("resize", function(e){
        $("#tabs").tabs("option", "heightStyle", "fill");
    });
    //$(document).bind("touchmove", function(e){ e.preventDefault(); });
    //preventoverscroll(document.querySelector('.ui-tabs-panel'));

    //document.body.addEventListener('touchmove', function(evt) {
    //    //In this case, the default behavior is scrolling the body, which
    //    //would result in an overflow.  Since we don't want that, we preventDefault.
    //    if(!evt._isScroller) {
    //        evt.preventDefault()
    //    }
    //});

    var todayDate = new Date();
    var todayDateString = todayDate.getFullYear() + "-" + ("0"+(todayDate.getMonth()+1)).slice(-2) + "-" + ("0"+todayDate.getDate()).slice(-2);

    // init control elements
    $('#progressBar').progressbar();
    $('#plannerDate').datetimepicker({
        format: 'Y-m-d',
        timepicker: false,
        dayOfWeekStart: 1,
        lang: 'de',
        inline: true,
        onChangeDateTime: newDateSelected
    }).val(todayDateString);
    $("#calcRoute").button().click(calcRoute);
    $("#deleteRoute").button().click(deleteWaypointList);
    $("#saveRoute").button().click(saveRoute);
    $("#loadRoute").button().click(loadRouteForPlannerTab);
    $("#addressListGUI").sortable({ update: function(event, ui) { resortAddressList(); updateWaypointListGUI(); }});
    $("#exportRoute").button().click(exportRoute);


    // init map
    var mapOptions = {
        center : new google.maps.LatLng(0,0),
        zoom : 2,
        mapTypeId : google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map(document.getElementById('mapDiv'), mapOptions);
    map.controls[google.maps.ControlPosition.TOP_CENTER].push(createMapSearchBox());


    // create an OverlappingMarkerSpiderfier instance associated with the map
    oms = new OverlappingMarkerSpiderfier(map, {
        markersWontMove: true
        ,markersWontHide: true
        ,basicFormatEvents: true
        ,keepSpiderfied: true
        ,nearbyDistance: 1
        ,circleSpiralSwitchover: 20
    });

    // init geocoder
    geocoder = new google.maps.Geocoder();


    // init account tab
    initAccountManager();


    // load account settings
    $.post("accessAccount.php", {function: "fetchAccountSettings"}, function(retVal) {
        if ('error' in retVal) { alert(retVal.error); }
        else {
            defaultMarkerIconIndex = retVal.result.defaultMarkerIcon;
            calendarLink = retVal.result.calendarLink;

            // load customer groups
            $.post("accessCustomers.php", {function: "fetchCustomerGroups"}, function (retVal) {
                if ('error' in retVal) { alert(retVal.error); }
                else {
                    if (retVal.result != null) {
                        var customerGroupsTemp = retVal.result;
                        $.each(customerGroupsTemp, function (k, group) {
                            customerGroups[group.groupID] = group;
                        });
                    }

                    // load customers from DB and display them on map
                    $.post("accessCustomers.php", {function: "fetchCustomers"}, function (retVal) {
                        if ('error' in retVal) { alert(retVal.error); }
                        else {
                            if (retVal.result != null)
                                customers = retVal.result;

                            startTime = new Date().getTime();
                            nextAddress = 0;
                            findNextAddress();

                            // init table with route data
                            initRouteManager();

                            // init table with customer data
                            initCustomerManager();

                            // init settings tab
                            initSettingsManager();
                        }
                    });
                }
            });
        }
    });


    // if the last selected tab is available, jump to this tab
    if (localStorage.selectedTab) {
        $("#tabs").tabs({ active: localStorage.selectedTab });
    }
}


function createMapSearchBox() {
    var searchDiv = document.createElement('div');
    searchDiv.style.margin = "2em";
    searchDiv.style.width = "100%";
    searchDiv.style.textAlign = 'center';

    var searchField = document.createElement('input');
    searchField.type = "text";
    searchField.id = "searchString";
    searchField.style.height = "1.5em";
    searchField.style.width = "33%";
    searchField.style.maxWidth = "250px";
    searchField.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
    searchField.title = 'Name, Adresse oder ID eines Kunden eingeben';
    searchDiv.appendChild(searchField);

    var searchButton = document.createElement('input');
    searchButton.type = "button";
    searchButton.id = "searchButton";
    searchButton.value = "Suchen";
    searchButton.style.height = "2.4em";
    searchButton.style.width = "80px";
    searchButton.style.margin = "0 0.5em 0 0.5em";
    searchButton.style.padding = 0;
    searchButton.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
    searchDiv.appendChild(searchButton);

    //$('#searchString').on('keyup', function(e) { if (e.keyCode === 13) $('#searchButton').click(); });
    //$("#searchButton").button().click(searchLocation);

    google.maps.event.addDomListener(searchField, 'keyup', function(e) { if (e.keyCode === 13) searchLocation(); });
    google.maps.event.addDomListener(searchButton, 'click', searchLocation);

    return searchDiv;
}


function findNextAddress() {
    if (nextAddress < customers.length) {
        if (customers[nextAddress].lat != null && customers[nextAddress].lng != null) {
            createMarker(customers[nextAddress]);
            nextAddress++;
            $('#progressBar').progressbar("value", nextAddress/customers.length * 100);
            // to avoid deep recursions we trigger the function asynchronously every 1000 instance
            if (nextAddress%1000 != 0) findNextAddress();
            else setTimeout(findNextAddress, 0);
        }
        else {
            setTimeout(function(){ geoCode(customers[nextAddress], findNextAddress); }, delay);
            $('#progressBar').progressbar("value", nextAddress/customers.length * 100);
        }
    } else {
        $('#progressBarDiv').hide();
        endTime = new Date().getTime();
        //alert("all markers placed. this took " + (endTime-startTime)/1000 + " sec. Final delay = " + delay);
        if (customers.length > 0 && !$('#mapDiv').is(':hidden')) {
            map.fitBounds(markerBounds);
            mapScaled = true;
        }
    }
}


function geoCode(customer, next) {
    geocoder.geocode(
        {'address': customer.address},
        function (results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
                customer.lat = results[0].geometry.location.lat();
                customer.lng = results[0].geometry.location.lng();

                //apply changes to database
                $.post("accessCustomers.php", {function: "updateCustomer", customer: customer}, function(retVal) {
                    if('error' in retVal) { alert(retVal.error); }
                });

                createMarker(customer);
                nextAddress++;
                //delay--;
            }
            else if (status == google.maps.GeocoderStatus.OVER_QUERY_LIMIT) {
                // let's try this address again with larger delay
                delay++;
            }
            else {
                alert(
                    'ID: '      + customer.optID   + '\n' +
                    'Name: '    + customer.name    + '\n' +
                    'Adresse: ' + customer.address + '\n' +
                    '\n' +
                    'Die Adresse konnte nicht gefunden werden.\n' +
                    'Status: ' + status);
                nextAddress++;
            }
            next();
        }
    );
}


function createMarker(customer) {
    var latLng = new google.maps.LatLng(customer.lat, customer.lng);
    var icon = markerIcons[ defaultMarkerIconIndex ];
    var zIndex = 1000;
    var animation = null;

    // check if customer is home address
    if (customer.name == "HOME") {
        icon = homeIcon;
    }
    else {
        // check if customer belongs to a group
        if (customer.groupID != null) {
            icon = markerIcons[ customerGroups[customer.groupID].iconindex ];
        }

        // check if customer's appointment is on selected date (overwrites group icon)
        var dateString = $("#plannerDate").val();
        if (customer.appointment && customer.appointment.split(" ")[0] == dateString) {
            icon = appointmentIcon;
            animation = google.maps.Animation.BOUNCE;
            zIndex = 10000;
        }
    }

    var marker = new google.maps.Marker({
        // map: map,
        position: latLng,
        zIndex: zIndex,
        icon: icon,
        anchorPoint: new google.maps.Point(-1,-8),
        animation: animation
    });
    oms.addMarker(marker);  // adds the marker to the spiderfier _and_ the map

    // google.maps.event.addListener(marker, 'click', function () { markerClicked(customer); });
    google.maps.event.addListener(marker, 'spider_click', function () { markerClicked(customer); });

    markerList[customer.customerID] = marker;

    markerBounds.extend(latLng);
}


function resetMarkerDefaults(customer) {
    var icon = markerIcons[ defaultMarkerIconIndex ];

    if (customer.name == "HOME") {
        icon = homeIcon;
    }
    else if (customer.groupID != null) {
        icon = markerIcons[ customerGroups[customer.groupID].iconindex ];
    }
    markerList[customer.customerID].setZIndex(1000);
    markerList[customer.customerID].setIcon(icon);
    markerList[customer.customerID].setAnimation(null);
}


function markerClicked(customer) {
    infoWindow.close();

    var groupDescription = "";
    if (customer.groupID != null) {
        groupDescription = customerGroups[customer.groupID].description;
    }

    var infoWindowContent =
        "<div id='infoWindowDiv'>"
        + "<b>ID:</b> "                   +(customer.optID != null? customer.optID : "") + " <br/>"
        + "<b>Name:</b> "                 + customer.name + " <br/>"
        + "<b>Adresse:</b> "              + customer.address + " <br/>"
        + "<b>Telefon:</b> "              + customer.phone + " <br/>"
        + "<b>Fachgebiet:</b> "           + customer.areaofexpertise + " <br/>"
        + "<b>Zuletzt besucht:</b> "      +(customer.visit != null? tableOfCustomers.checkDate(customer.visit).formattedDate : "") + " <br/>"
        + "<b>N&auml;chster Termin:</b> " +(customer.appointment != null? tableOfCustomers.checkDatetime(customer.appointment).formattedDatetime : "") + " <br/>"
        + "<b>Gruppe:</b> "               + groupDescription + " <br/>"
        + "<b>Kommentar:</b> "            +(customer.hint != null? customer.hint : "") + " <br/>"
        + "<div align='center'><button id='addWaypoint'>Besuchen</button></div>" +
        "</div>";

    infoWindow.setOptions({
        content: infoWindowContent,
        zIndex: 1000
    });

    infoWindow.open(map, markerList[customer.customerID]);
    $("#addWaypoint").button().click(function() { addWaypoint(customer); });
}


function newDateSelected() {
    var dateString = $('#plannerDate').val();

    // update markers with appointments on selected date
    $.each(customers, function(i, customer) {
        if (customer.lat != null && customer.lng != null) {
            resetMarkerDefaults(customer);

            if (customer.appointment && customer.appointment.split(" ")[0] == dateString) {
                markerList[customer.customerID].setIcon(appointmentIcon);
                markerList[customer.customerID].setAnimation(google.maps.Animation.BOUNCE);
                markerList[customer.customerID].setZIndex(10000);
            }
        }
    });
}


function searchLocation() {
	var searchString = document.getElementById("searchString").value;
    var isNumber = !isNaN(searchString);
    var searchStringRegEx = new RegExp(searchString, 'i');
    var customerFound = false;

    // first search through list of customers if there is a match in optID, name or address
    $.each(customers, function(k, customer) {
        if (isNumber) {
            if (customer.optID == parseInt(searchString)) {
                markerClicked(customer);
                customerFound = true;
                return false;
            }
        }
        else if (searchStringRegEx.test(customer.name)) {
            markerClicked(customer);
            customerFound = true;
            return false;
        }
        else if (searchStringRegEx.test(customer.address)) {
            markerClicked(customer);
            customerFound = true;
            return false;
        }
    });

    if (customerFound) return;

    // if there is no match with customer data, search for the address using Google
	geocoder.geocode(
        {'address': searchString},
        function(results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
                map.setCenter(results[0].geometry.location);

                var searchMarker = new google.maps.Marker({
                        map: map,
                        position: results[0].geometry.location,
                        title: searchString,
                        icon: "http://labs.google.com/ridefinder/images/mm_20_white.png",
                        zIndex: 10000
                    });

                map.setZoom(15);

                searchMarker.name = searchString;
                searchMarker.address = results[0].formatted_address;
                searchMarker.lat = results[0].geometry.location.lat();
                searchMarker.lng = results[0].geometry.location.lng();

                (function(m) {
                    google.maps.event.addListener(searchMarker, "click", function() {searchMarkerClicked(m);});
                })(searchMarker);
            }
            else {
                alert('"' + searchString + '"' + '\nDie Adresse konnte nicht gefunden werden.\nStatus: ' + status);
            }
	    }
    );
}


function searchMarkerClicked(marker) {
	infoWindow.close();

	var infoWindowContent = "<div id='infoWindowDiv'>"
						    + marker.name + "<br/>"
                            + marker.address + "<br/>"
						    + "<div align='center'><button id='addWaypoint'>Hinzuf&uuml;gen</button>"
						    + "<button id='deleteSearchMarker'>L&ouml;schen</button></div></div>";

	infoWindow.setOptions({
		content: infoWindowContent,
		zIndex: 1000
	});

	infoWindow.open(map, marker);
	$("#addWaypoint").button().click(function() { addWaypoint(marker); });
	$("#deleteSearchMarker").button().click(function() { deleteMarker(marker); });
}


function deleteMarker(marker) {
	marker.setMap(null);
	infoWindow.close();
}


function addWaypoint(customer) {
    // by default, waypoint is not locked and can be moved by Google Directions service to optimize route
    customer.locked = false;

    // insert new waypoint at insert point
    insertIndex++;
    waypointList.splice(insertIndex, 0, customer);

    // update address list in GUI
    updateWaypointListGUI();

    // close info window in map
    infoWindow.close();
}


function resortAddressList() {
	var sortedIDs = $("#addressListGUI").sortable("toArray", {attribute: "value"});
	addressListTemp = waypointList.slice();
	for (var i = 0; i < waypointList.length; i++)
		waypointList[i] = addressListTemp[sortedIDs[i]-1];
}


function updateWaypointListGUI() {
	// remove all current info boxes
	for (var i = 0; i < waypointIndexList.length; i++)
		waypointIndexList[i].setMap(null);
	waypointIndexList = [];

	var listStart = document.getElementById("listStart");
	var insertPoint = (insertIndex == -1) ? "class='ui-icon ui-icon-triangle-1-s'" : "";
	listStart.innerHTML = "<button class='insertButtons'  value='-1' id='invisibleButton'><span " + insertPoint + "></span></button>";

    var selectedDate = $('#plannerDate').val();

	// update sortable list and create new info boxes
	var addressListGUI = document.getElementById("addressListGUI");
	addressListGUI.innerHTML = "";
	for (i = 0; i < waypointList.length; i++) {
		var locked = waypointList[i].locked ? "ui-icon-locked" : "ui-icon-unlocked";
		insertPoint = (insertIndex == i) ? "class='ui-icon ui-icon-triangle-1-s'" : "";
		var temp   = waypointList[i].locked | i == 0 | i == waypointList.length-1;
		var lockedStyle = temp ? "style='background: #FFC7C7'" : "";

        var addressStyle1 = "";
        var addressStyle2 = "";
        var appointmentInfo = "";
		if (waypointList[i].appointment && waypointList[i].appointment.split(" ")[0] == selectedDate) {
            addressStyle1 = "<b>";
            addressStyle2 = "</b>";
            appointmentInfo = " (Termin " + waypointList[i].appointment.split(" ")[1] + ")";
        }
		
		addressListGUI.innerHTML += "<li class='ui-state-default' value='" + (i+1) + "' " + lockedStyle + ">"
								 +  addressStyle1
								 +  (i+1) + ". " + waypointList[i].name + appointmentInfo + "<br />"
								 +  			   waypointList[i].address
								 +  addressStyle2
								 +  "<button class='deleteButtons' value='" + i + "' id='iconButton'><span class='ui-icon ui-icon-closethick'></span></button>"
								 +  "<button class='lockButtons'   value='" + i + "' id='iconButton'><span class='ui-icon " +   locked   + "'></span></button>" + "<br />"
								 +  "<button class='insertButtons' value='" + i + "' id='invisibleButton'><span " + insertPoint + "></span></button>"
								 +  "</li>";

        var latLng = new google.maps.LatLng(waypointList[i].lat,waypointList[i].lng);

        waypointIndexList[i] = new MarkerWithLabel({
	       icon: "small_blue",
	       position: latLng,
	       anchorPoint: new google.maps.Point(11, 25),
	       map: map,
	       draggable: true,
	       raiseOnDrag: false,
	       clickable: false,
	       labelContent: "<div " + lockedStyle + ">" + addressStyle1 + (i+1) + addressStyle2 + "</div>",
	       labelAnchor: new google.maps.Point(11, 25),
	       labelClass: "waypointIndexLabel",
	       labelInBackground: false
	     });
	}
	
	// add callback functions to list buttons
    $('.lockButtons').button({text: false}).click(lockWaypoint);
    $('.deleteButtons').button({text: false}).click(deleteWaypoint);
	$('.insertButtons').click(setInsertPoint);
}


function lockWaypoint() {
	// toggle lock flag
	waypointList[this.value].locked = !waypointList[this.value].locked;

	// update address list in GUI
	updateWaypointListGUI();
}


function deleteWaypoint() {
	if (this.value <= insertIndex) insertIndex--;
	
	// delete address whose delete button was clicked from list
	waypointList.splice(this.value, 1);
	
	// update address list in GUI
	updateWaypointListGUI();
}


function setInsertPoint() {
	insertIndex = this.value;
	
	// update address list in GUI
	updateWaypointListGUI();
}


function deleteWaypointList() {
	waypointList = [];
	insertIndex = -1;
	
	for (var i = 0; i < waypointIndexList.length; i++)
		waypointIndexList[i].setMap(null);
	waypointIndexList = [];
	
	var addressListGUI = document.getElementById("addressListGUI");
	addressListGUI.innerHTML = "";
	
	var summary = document.getElementById("routingResult");
	summary.innerHTML = "";
	
	for (var s = 0; s < directionsDisplay.length; s++) {
        directionsDisplay[s].setMap(null);
        // directionsDisplayShadow[s].setMap(null);
    }
}


function exportRoute() {
    var dateString = $('#plannerDate').val();
    var routingResult = $("#routingResult");
    if (routingResult.html() != "")
        routingResult.wordExport("Route_" + dateString);
    else
        alert("Klicken Sie zuerst auf 'Route optimieren' bevor Sie die Route exportieren.");
}
