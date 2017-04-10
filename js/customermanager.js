
var tableOfCustomers;
var customerMetadata;

function initCustomerManager() {
    // init meta data of customer table
    customerMetadata = [];
    customerMetadata.push({ name: "optID",       label: "ID",      datatype: "integer", editable: false});
    customerMetadata.push({ name: "name",        label: "Name",    datatype: "string",  editable: false});
    customerMetadata.push({ name: "address",     label: "Adresse", datatype: "string",  editable: false});
    customerMetadata.push({ name: "phone",       label: "Telefon", datatype: "string",  editable: false});
    customerMetadata.push({ name: "visit",       label: "Zuletzt besucht", datatype: "date",    editable: true});
    customerMetadata.push({ name: "appointment", label: "N\xE4chster Termin",  datatype: "datetime",editable: (calendarLink == null)});
    customerMetadata.push({ name: "hint",        label: "Zielgruppe", datatype: "string",  editable: true});
    customerMetadata.push({ name: "group",       label: "Gruppe",  datatype: "string",  editable: true});

    // create grid object
    tableOfCustomers = new EditableGrid("CustomerDataTable", {
        editmode: "static",
        pageSize: 30,
        modelChanged: updateCustomerInDBFromCustomerManager,
        tableRendered: updatePaginator
    });

    _$('customerFilter').onkeyup = function() { tableOfCustomers.filter(_$('customerFilter').value); };

    updateCustomerTable();
}


function updateCustomerTable() {
    // define hints
    customerMetadata[6].values = {
        "null":    " ",
        "P":      "P"
    };

    // define groups
    customerMetadata[7].values = {};
    customerMetadata[7].values["null"] = " ";
    $.each(customerGroups, function(k, group) {
        customerMetadata[7].values[group.groupID] = group.description;
    });

    // define customer data
    var data = [];
    $.each(customers, function(i, customer) {
        data.push({id: i+1, values: {
            "optID":       customer.optID,
            "name":        customer.name,
            "address":     customer.address,
            "phone":       customer.phone? customer.phone : "",
            "visit":       customer.visit? customer.visit : "",
            "appointment": customer.appointment? customer.appointment : "",
            "hint":        customer.hint,
            "group":       customer.groupID}
        });
    });

    tableOfCustomers.load({"metadata": customerMetadata, "data": data});
    tableOfCustomers.renderGrid("tableOfCustomers", "editgrid");

    // set active (stored) filter if any
    _$('customerFilter').value = tableOfCustomers.currentFilter ? tableOfCustomers.currentFilter : '';
}

function updateCustomerInDBFromCustomerManager(rowIdx, colIdx, oldValue, newValue, row) {
    var rID = this.getRowId(rowIdx);
    updateCustomerInDB(customers[rID-1], this.getColumnName(colIdx), newValue);
}

function updateCustomerInDBFromRouteManager(rowIdx, colIdx, oldValue, newValue, row) {
    var rID = this.getRowId(rowIdx);
    updateCustomerInDB(selectedRoute[rID-1], this.getColumnName(colIdx), newValue);
}

function updateCustomerInDB(customer, columnName, newValue) {
    var editAllWithSameAddress = false;

    // update customer data in JSON object
    switch (columnName) {
        case "visit":
            customer.visit = newValue != ""? newValue : null;
            //editAllWithSameAddress = true;
            break;
        case "appointment":
            customer.appointment = newValue != ""? newValue : null;
            break;
        case "hint":
            customer.hint = newValue != "null"? newValue : null;
            break;
        case "group":
            customer.groupID = newValue != "null"? parseInt(newValue) : null;
            // editAllWithSameAddress = true;
            break;
    }

    if (editAllWithSameAddress) {
        $.each(customers, function(i, cust) {
            if (cust.address == customer.address) {
                cust.visit   = customer.visit;
                cust.groupID = customer.groupID;
            }
        });
        updateCustomerTable();
        loadRouteForRouteTab();
    }

    // apply changes to database
    $.post("accessCustomers.php", {function: "updateCustomer", customer: customer, editAllWithSameAddress: editAllWithSameAddress}, function(retVal) {
        if('error' in retVal) { alert(retVal.error); }
    });
}


// function to render the paginator control
function updatePaginator()
{
    var paginator = $("#paginator").empty();
    var nbPages = this.getPageCount();

    // get interval
    var interval = this.getSlidingPageInterval(20);
    if (interval == null) return;

    // get pages in interval (with links except for the current page)
    var pages = this.getPagesInInterval(interval, function(pageIndex, isCurrent) {
        if (isCurrent) return "" + (pageIndex + 1);
        return $("<a>").css("cursor", "pointer").html(pageIndex + 1).click(function(event) { tableOfCustomers.setPageIndex(parseInt($(this).html()) - 1); });
    });

    // "first" link
    var link = $("<a>").html("<img src='" + "img/gofirst.png" + "'/>&nbsp;");
    if (!this.canGoBack()) link.css({ opacity : 0.4, filter: "alpha(opacity=40)" });
    else link.css("cursor", "pointer").click(function(event) { tableOfCustomers.firstPage(); });
    paginator.append(link);

    // "prev" link
    link = $("<a>").html("<img src='" + "img/prev.png" + "'/>&nbsp;");
    if (!this.canGoBack()) link.css({ opacity : 0.4, filter: "alpha(opacity=40)" });
    else link.css("cursor", "pointer").click(function(event) { tableOfCustomers.prevPage(); });
    paginator.append(link);

    // pages
    for (p = 0; p < pages.length; p++) paginator.append(pages[p]).append(" | ");

    // "next" link
    link = $("<a>").html("<img src='" + "img/next.png" + "'/>&nbsp;");
    if (!this.canGoForward()) link.css({ opacity : 0.4, filter: "alpha(opacity=40)" });
    else link.css("cursor", "pointer").click(function(event) { tableOfCustomers.nextPage(); });
    paginator.append(link);

    // "last" link
    link = $("<a>").html("<img src='" + "img/golast.png" + "'/>&nbsp;");
    if (!this.canGoForward()) link.css({ opacity : 0.4, filter: "alpha(opacity=40)" });
    else link.css("cursor", "pointer").click(function(event) { tableOfCustomers.lastPage(); });
    paginator.append(link);
}
