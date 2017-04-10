var directionsService = new google.maps.DirectionsService();
var directionsDisplay = [];
var directionsDisplayShadow = [];
var sectionAddressList = [];
var drivingSectionDurations = [];
var walkingSectionDurations = [];
var drivingSectionDistances = [];
var walkingSectionDistances = [];
var drivingSectionsComplete;
var walkingSectionsComplete;


function calcRoute2() {
    // check if at least a start and end address is available
    if (waypointList.length < 2) {
        alert("Die Route muss mindestens zwei Routenpunkte enthalten.\n\nKlicken Sie Marker auf der Karte und w\xE4hlen 'Besuchen', um Routenpunkte hinzuzuf\xFCgen.");
        return;
    }

    // Create the tsp object
    tsp = new BpTspSolver(map);
    tsp.startOver();

    // Set your preferences
    //tsp.setTravelMode(google.maps.DirectionsTravelMode.WALKING);

    // The first point added is the starting location.
    // The last point added is the final destination (in the case of A - Z mode)
    for (var i = 0; i < waypointList.length; i++) {
        var latLng = new google.maps.LatLng(waypointList[i].lat,waypointList[i].lng);
        tsp.addWaypoint(latLng);
    }

    tsp.solveAtoZ(function() {
        // If you just want the permutation of the location indices that is the best route:
        var order = tsp.getOrder();

        // If you want the duration matrix that was used to compute the route:
        var durations = tsp.getDurations();

        var a = 5;
    });
}

function calcRoute() {
	// check if at least a start and end address is available
	if (waypointList.length < 2) {
		alert("Die Route muss mindestens zwei Routenpunkte enthalten.\n\nKlicken Sie Marker auf der Karte und w\xE4hlen 'Besuchen', um Routenpunkte hinzuzuf\xFCgen.");
		return;
	}
	
	// get start and end points of sections
	var numOfSections = 1;
	var startPoint = [0];
	var endPoint = [];
	for (var i = 1; i < waypointList.length-1; i++) {
		numOfSections += waypointList[i].locked;
		if (waypointList[i].locked) { endPoint.push(i+1); startPoint.push(i); }
	}
	endPoint.push(waypointList.length);
	
	// init section variables
	sectionAddressList = new Array(numOfSections);
	drivingSectionDurations = new Array(numOfSections);
	walkingSectionDurations = new Array(numOfSections);
	drivingSectionDistances = new Array(numOfSections);
	walkingSectionDistances = new Array(numOfSections);
	drivingSectionsComplete = 0;
	walkingSectionsComplete = 0;

    //var colorpicker = "<div style='color: #000000'>";

    // clear current directionsDisplays
    for (var s = 0; s < directionsDisplay.length; s++) {
        directionsDisplay[s].setMap(null);
        // directionsDisplayShadow[s].setMap(null);
    }

	// loop over sections
	for (s = 0; s < numOfSections; s++) {
		// create directions renderer in case it doesn't exist yet
		if (s >= directionsDisplay.length) {
            //var lineSymbol = {
            //    path: 'M 0,-1 0,1',
            //    strokeOpacity: 1,
            //    scale: 3
            //};
            // var lineSymbol = {
			 //   path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
			 //   strokeOpacity: 1,
			 //   scale: 3
            // };
            directionsDisplay.push( new google.maps.DirectionsRenderer({suppressMarkers: true
                ,polylineOptions: {
                    strokeColor: '#2165d1' //'#408aff'
                    ,strokeOpacity: 1
                    ,strokeWeight: 5
					// ,clickable: true
                    // ,icons: [{
                    //    icon: lineSymbol,
                    //    offset: '0',
                    //    repeat: '50px'
                    // }]
                }
            }));
            // directionsDisplayShadow.push( new google.maps.DirectionsRenderer({suppressMarkers: true
            //     ,polylineOptions: {
            //         strokeColor: '#000000'
            //         ,strokeOpacity: 0.6
            //         ,strokeWeight: 6
            //         //,icons: [{
            //         //    icon: lineSymbol,
            //         //    offset: '0',
            //         //    repeat: '10px'
            //         //}]
            //     }
            // }));
        }

		
		// extract address list of current section
		sectionAddressList[s] = waypointList.slice(startPoint[s], endPoint[s]);
		
		// prepare list of waypoints for google request
		var waypts = [];
		for (i = 1; i < sectionAddressList[s].length - 1; i++) {
			waypts.push({
				location : sectionAddressList[s][i].address,
				stopover : true
			});
		}
		
		var drivingRequest = {
			origin : sectionAddressList[s][0].address,
			destination : sectionAddressList[s][sectionAddressList[s].length-1].address,
			waypoints : waypts,
			optimizeWaypoints : true,
			travelMode : google.maps.TravelMode.DRIVING
			//travelMode : google.maps.TravelMode.TRANSIT
		};
		
		var walkingRequest = {
			origin : sectionAddressList[s][0].address,
			destination : sectionAddressList[s][sectionAddressList[s].length-1].address,
			waypoints : waypts,
			optimizeWaypoints : true,
			travelMode : google.maps.TravelMode.WALKING
		};
		
		if (numOfSections < 6) {
			setTimeout(c1(s, drivingRequest), 0);
			setTimeout(c2(s, walkingRequest), (s+1) * 100);
		}
		else {
			setTimeout(c1(s, drivingRequest), 2*s     * 800);
			setTimeout(c2(s, walkingRequest), (2*s+1) * 800);
		}
	}
}


function c1(s, request) {
	return function() {
		directionsService.route(request, function(response, status) {
			if (status == google.maps.DirectionsStatus.OK) {
				var route = response.routes[0];
				
                // directionsDisplayShadow[s].setMap(map);
                // directionsDisplayShadow[s].setDirections(response);

                directionsDisplay[s].setMap(map);
                directionsDisplay[s].setDirections(response);
	
				// update order of address list on current section according to googles optimized order
				var sectionAddressListTemp = sectionAddressList[s].slice();
				for (var i = 1; i < sectionAddressList[s].length-1; i++)
					sectionAddressList[s][i] = sectionAddressListTemp[route.waypoint_order[i-1]+1];
				
				// store results for duration and distance
				drivingSectionDurations[s] = new Array(route.legs.length);
				drivingSectionDistances[s] = new Array(route.legs.length);
				for (i = 0; i < route.legs.length; i++) {
					drivingSectionDurations[s][i] = route.legs[i].duration;
					drivingSectionDistances[s][i] = route.legs[i].distance;
				}
				
				// notify completed section
				compileRouteResult("DRIVING");
			}
			else if (status == google.maps.DirectionsStatus.MAX_WAYPOINTS_EXCEEDED)
				alert("Zu viele Wegpunkte auf einem Streckenabschnitt.\nMaximal 23 Wegpunkte zwischen zwei Fixpunkten.");
			else
				alert("DRIVING: Beim berechnen des Routenabschnitts " + s + " ist ein Fehler aufgetreten.\nFehler: " + status);
		});
	};
}


function c2(s, request){
	return function() {
		directionsService.route(request, function(response, status) {
			if (status == google.maps.DirectionsStatus.ZERO_RESULTS) {
				walkingSectionDurations[s] = new Array(request.waypoints.length+1);
				walkingSectionDistances[s] = new Array(request.waypoints.length+1);
				for (var i = 0; i < walkingSectionDurations[s].length; i++) {
					walkingSectionDistances[s][i] = {text : "keine Route"};
					walkingSectionDurations[s][i] = {text : "gefunden"};
				}
				
				// notify completed section
				compileRouteResult("WALKING");
			}
			else if (status == google.maps.DirectionsStatus.OK) {
				var route = response.routes[0];
				
				// store results for duration and distance
				walkingSectionDurations[s] = new Array(route.legs.length);
				walkingSectionDistances[s] = new Array(route.legs.length);
				for (i = 0; i < route.legs.length; i++) {
					walkingSectionDurations[s][i] = route.legs[i].duration;
					walkingSectionDistances[s][i] = route.legs[i].distance;
				}
				
				// notify completed section
				compileRouteResult("WALKING");
			}
			else if (status == google.maps.DirectionsStatus.MAX_WAYPOINTS_EXCEEDED){
				// do nothing, this error is already handled in c1()
			}
			else {
				alert("WALKING: Beim berechnen des Routenabschnitts " + s + " ist ein Fehler aufgetreten.\nFehler: " + status);
			}
		});
	};
}
		

function compileRouteResult(type) {
	if (type == "DRIVING") { drivingSectionsComplete += 1; }
	if (type == "WALKING") { walkingSectionsComplete += 1; }
	
	if (drivingSectionsComplete < sectionAddressList.length) return;
	if (walkingSectionsComplete < sectionAddressList.length) return;
	
	// as google might have reordered waypoints between fixed addresses
	// we first need to reorder address list
	waypointList = [];
	waypointList[0] = sectionAddressList[0][0];
	var drivingDurations = [];
	var drivingDistances = [];
	var walkingDurations = [];
	var walkingDistances = [];
	for (var s = 0; s < sectionAddressList.length; s++) {
		waypointList = waypointList.concat(sectionAddressList[s].slice(1, sectionAddressList[s].length));
		drivingDurations = drivingDurations.concat(drivingSectionDurations[s].slice());
		drivingDistances = drivingDistances.concat(drivingSectionDistances[s].slice());
		walkingDurations = walkingDurations.concat(walkingSectionDurations[s].slice());
		walkingDistances = walkingDistances.concat(walkingSectionDistances[s].slice());
	}
	
	// reset routingResult information.
	var routingResult = document.getElementById("routingResult");
	routingResult.innerHTML = "";

    var selectedDate = $('#plannerDate').val();

    var addressStyle1 = "";
    var addressStyle2 = "";
    var appointmentInfo = "";
    if (waypointList[0].appointment && waypointList[0].appointment.split(" ")[0] == selectedDate) {
        addressStyle1 = "<b>";
        addressStyle2 = "</b>";
        appointmentInfo = " (Termin " + waypointList[0].appointment.split(" ")[1] + ")";
    }
	
	routingResult.innerHTML += addressStyle1
					  +  "1. " + waypointList[0].name + appointmentInfo + "<br />"
					  + 		 waypointList[0].address + "<br />"
					  +  "Telefon: " + (waypointList[0].phone? waypointList[0].phone : "") + "<br />"
					  + addressStyle2;

	// add remaining addresses
	for (i = 1; i < waypointList.length; i++) {
        addressStyle1 = "";
        addressStyle2 = "";
        appointmentInfo = "";
        if (waypointList[i].appointment && waypointList[i].appointment.split(" ")[0] == selectedDate) {
            addressStyle1 = "<b>";
            addressStyle2 = "</b>";
            appointmentInfo = " (Termin " + waypointList[i].appointment.split(" ")[1] + ")";
        }

        routingResult.innerHTML += "<hr>"
                          +  "<small>"
						  +  "&emsp;" + "<i>Auto: " + drivingDistances[i-1].text + ", " + drivingDurations[i-1].text + "</i><br />"
						  +  "&emsp;" + "<i>Gehen: " + walkingDistances[i-1].text + ", " + walkingDurations[i-1].text + "</i><br />"
						  +  "</small>"
						  +  "<hr>"
						  +  addressStyle1
						  +  (i+1) + ". " + waypointList[i].name + appointmentInfo + "<br />"
						  +  			    waypointList[i].address + "<br />"
						  +  "Telefon: " + (waypointList[i].phone? waypointList[i].phone : "") + "<br />"
						  +  addressStyle2;
		}

	// update address list in GUI
	updateWaypointListGUI();
	
	// zoom map to contain all markers
	var bounds = new google.maps.LatLngBounds();
	for (var i = 0; i < waypointList.length; i++) {
        var latLng = new google.maps.LatLng(waypointList[i].lat,waypointList[i].lng);
        bounds.extend(latLng);
    }

	map.fitBounds(bounds);
}
