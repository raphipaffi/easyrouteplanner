
function initSettingsManager() {
    // init customer group settings
    createTableOfCustomerGroups();
    $('#addNewCustomerGroup').button().click(function(){
        createCustomerGroupInDB();
    });

    // init default marker setting
    createDefaultIconSelector();

    // init calendar settings
    $('#calendarLink').val(calendarLink);
    $('#saveCalendarLink').button().click(calendarLinkUpdated);
    updateAppointmentsFromCalendar();
}


function updateAppointmentsFromCalendar() {
    var calDiv = document.getElementById('calendarDiv');
    calDiv.innerHTML = "";

    // search for appointments in calendar
    if (calendarLink != null && calendarLink != "") {
        // block editing of appointments from easy route planner
        customerMetadata[5].editable = false;
        routeMetadata[3].editable = false;

        calDiv.style.color = "#AFAFAF";
        calDiv.innerHTML = "<p>Suche Kundentermine im Kalender. Einen Moment bitte...</p>";

        try {
            var calendarURL = 'includes/proxy.php?url=' + calendarLink;
            var calendar = $.parseIcs(calendarURL);
            var today = new Date();

            // extract future customer appointments from the calendar data
            var customerAppointments = [];
            $.each(calendar.event, function(i, event) {
                var eventDate = calenDate(event.dtstart);
                // only consider future events
                if (eventDate >= today) {
                    // look for customer ID in event title
                    var idString = event.summary.match(/ID(\s)*[0-9]+/i);
                    if (idString) {
                        // remove ID letters to only keep the number
                        idString = idString[0].match(/[0-9]+/);
                        customerAppointments.push({ID: parseInt(idString), date: eventDate});
                    }
                }
            });

            // update appointments in customer list
            $.each(customers, function(k, customer) {
                // remove current appointment
                customer.appointment = null;

                // check if there is an appointment set for this customer from the calendar
                $.each(customerAppointments, function(i, appointment) {
                    if (customer.optID == appointment.ID) {
                        customer.appointment = appointment.date.getFullYear() + "-" + ("0"+(appointment.date.getMonth()+1)).slice(-2) + "-" + ("0"+appointment.date.getDate()).slice(-2) + " " + ("0"+appointment.date.getHours()).slice(-2) + ":" + ("0"+appointment.date.getMinutes()).slice(-2);
                        // alert("update appointment of " + customer.name + "\nnew appointment: " + customer.appointment);
                        return false; // break loop over customers
                    }
                });
            });

            // apply changes to database
            $.post("accessCustomers.php", {function: "updateAllAppointments", customers: customers}, function(retVal) {
                if('error' in retVal) { alert(retVal.error); }
            });

            calDiv.style.color = "#04D800";
            calDiv.innerHTML = "<p>Kundentermine wurden mit Kalender synchronisiert.</p>";

            // show calendar

            //document.createElement();
            //var calendarHtml =  "<iframe id='calendar'" +
            //                    "src='http://cdn.instantcal.com/cvir.html?id=cv_nav1&theme=GY&gtype=cv_dayGrid7&ccolor=%23ffffc0&wkst=Mon&time24=1&" +
            //                    "file=" + encodeURIComponent(decodeURIComponent(calendarLink)) + "'" +
            //                    "allowTransparency='true' scrolling='no' frameborder=0 height=400 width=600></iframe>";
            //calDiv.innerHTML = calendarHtml;

            //alert(calendarHtml);

            //var dateTimeString = dateTime.getFullYear() + "-" + ("0"+(dateTime.getMonth()+1)).slice(-2) + "-" + ("0"+dateTime.getDate()).slice(-2)
            //    + " " + ("0"+dateTime.getHours()).slice(-2) + ":" + ("0"+dateTime.getMinutes()).slice(-2) + ":" + ("0"+dateTime.getSeconds()).slice(-2);
            //alert(dateTimeString + "\n" + calendar.event[1].summary);
        } catch (err) {
            calDiv.style.color = "red";
            calDiv.innerHTML = "<p>Kalender konnte nicht importiert werden. Bitte &uuml;berpr&uuml;fen sie den Link.<br/>" + err + "</p>";

            // allow editing of appointments from easy route planner
            customerMetadata[5].editable = true;
            routeMetadata[3].editable = true;
        }
    }
    else {
        // allow editing of appointments from easy route planner
        customerMetadata[5].editable = true;
        routeMetadata[3].editable = true;
    }
}


function calenDate(icalStr)  {
    var strYear  = icalStr.substr(0,4);
    var strMonth = parseInt(icalStr.substr(4,2),10)-1;
    var strDay   = icalStr.substr(6,2);
    var strHour  = icalStr.substr(9,2);
    var strMin   = icalStr.substr(11,2);
    var strSec   = icalStr.substr(13,2);

    var timezone = icalStr.length>15? icalStr.substr(15) : null;

    var oDate =  new Date(strYear,strMonth, strDay, strHour, strMin, strSec);

    if (timezone == "Z") // if timestamp is in Zulu time (=GMT=UTC)
        oDate.setTime( oDate.getTime() - oDate.getTimezoneOffset()*60*1000 );

    return oDate;
}

function createDefaultIconSelector() {
    var defaultMarkerDiv = document.getElementById("defaultMarkerDiv");
    var html = "<select id='iconDefault'>";
    $.each(markerIcons, function (i, icon) {
        if (i == defaultMarkerIconIndex)
            html += "<option value='" + i + "' data-imagesrc='" + icon + "' selected=\"selected\"/> ";
        else
            html += "<option value='" + i + "' data-imagesrc='" + icon + "'/> ";
    });
    html += "</select>";

    defaultMarkerDiv.innerHTML = html;

    $('#iconDefault').ddslick({
        onSelected: function(selectedData){
            defaultMarkerIconIndex = selectedData.selectedIndex;
            updateDefaultMarkerInDB(defaultMarkerIconIndex);
        },
        width: 50
    });
}


function calendarLinkUpdated() {
    calendarLink = $('#calendarLink').val();
    if (calendarLink == "") calendarLink = null;

    updateCalendarLinkInDB(calendarLink);
    updateAppointmentsFromCalendar();
}


function createTableOfCustomerGroups() {
    var table = document.getElementById("tableOfCustomerGroups");
    table.innerHTML = '';
    $.each(customerGroups, function (i, group) {
        var tableRow = document.createElement('tr');
        tableRow.appendChild(createNameField(group));
        tableRow.appendChild(createMarkerSelector(group));
        tableRow.appendChild(createDeleteButton(group));
        table.appendChild(tableRow);

        $('#description' + group.groupID).focusout(function() {
            group.description = $('#description' + group.groupID).val();
            updateCustomerGroupInDB(group);
        });

        $('#icon' + group.groupID).ddslick({
            onSelected: function(selectedData){
                group.iconindex = selectedData.selectedIndex;
                updateCustomerGroupInDB(group);
            },
            width: 50
        });

        $('#delete' + group.groupID).button().click(function(){
            if(confirm('Sind Sie sicher, dass Sie die Gruppe "' + group.description + '" l\xF6schen wollen?\nAlle Kunden in dieser Gruppe werden danach keiner Gruppe angeh\xF6ren.')) {
                deleteCustomerGroupInDB(group);
            }
        });
    });
}


function createNameField(group) {
    var groupNameCell = document.createElement('td');
    groupNameCell.innerHTML = "<input id='description" + group.groupID + "' type='text' value='" + group.description + "'/>";
    return groupNameCell;
}

function createMarkerSelector(group) {
    var html = "<select id='icon" + group.groupID + "'>";
    $.each(markerIcons, function (i, icon) {
        if (i == group.iconindex)
            html += "<option value='" + i + "' data-imagesrc='" + icon + "' selected=\"selected\"/> ";
        else
            html += "<option value='" + i + "' data-imagesrc='" + icon + "'/> ";
    });
    html += "</select>";

    var tableCell = document.createElement('td');
    tableCell.innerHTML = html;
    return tableCell;
}

function createDeleteButton(group) {
    var tableCell = document.createElement('td');
    tableCell.innerHTML = "<button id='delete" + group.groupID + "'>Gruppe l&ouml;schen</button>";
    return tableCell;
}


function updateCustomerGroupInDB(group) {
    $.post("accessCustomers.php", {function: "updateCustomerGroup", group:group}, function(retVal) {
        if('error' in retVal) { alert(retVal.error); }
    });
}

function deleteCustomerGroupInDB(group) {
    $.post("accessCustomers.php", {function: "deleteCustomerGroup", group:group}, function(retVal) {
        if('error' in retVal) { alert(retVal.error); }
        else {
            // set groupID of customers that belong to this group to null
            $.each(customers, function(k, customer) {
                if (customer.groupID == group.groupID) {
                    customer.groupID = null;
                }
            });

            // remove group from customerGroups
            delete customerGroups[group.groupID];

            // update table of customer groups
            createTableOfCustomerGroups();
        }
    });
}

function createCustomerGroupInDB() {
    $.post("accessCustomers.php", {function: "createCustomerGroup"}, function(retVal) {
        if('error' in retVal) { alert(retVal.error); }
        else {
            group = retVal.result;
            // add group to customerGroups
            customerGroups[group.groupID] = group;

            // update table of customer groups
            createTableOfCustomerGroups();
        }
    });
}

function updateDefaultMarkerInDB(iconIndex) {
    $.post("accessAccount.php", {function: "updateDefaultMarkerIcon", iconIndex: iconIndex}, function(retVal) {
        if('error' in retVal) { alert(retVal.error); }
    });
}

function updateCalendarLinkInDB(calendarLink) {
    $.post("accessAccount.php", {function: "updateCalendarLink", link: calendarLink}, function(retVal) {
        if('error' in retVal) { alert(retVal.error); }
    });
}
