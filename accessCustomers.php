<?php
include_once 'includes/connectDB.php';
include_once 'includes/loginFunctions.php';
sec_session_start();

if (login_check() == false) {
    header('Location: ../login.php?error=1');
    exit;
}


header('Content-Type: application/json');

$accountID = $_SESSION['accountID'];
$aResult = array();

if( !isset($_POST['function']) ) {
    $aResult['error'] = 'No function name provided!'; }
else {
    switch($_POST['function']) {
        ///////////////////////////////////////////////////////////////////////////////////
        case 'fetchCustomers':
            $aResult['result'] = fetchCustomers($accountID);
            break;
        ///////////////////////////////////////////////////////////////////////////////////
        case 'updateCustomer':
            if( !isset($_POST['editAllWithSameAddress']) || $_POST['editAllWithSameAddress'] == "" || $_POST['editAllWithSameAddress'] == null ) {
                $editAllWithSameAddress = false;
            }
            else
                $editAllWithSameAddress = $_POST['editAllWithSameAddress'];

            if( !isset($_POST['customer']) || $_POST['customer'] == "" || $_POST['customer'] == null ) {
                $aResult['error'] = 'No customer submitted!';
            }
            else {
                $aResult['result'] = updateCustomer($accountID, $_POST['customer'], $editAllWithSameAddress);
            }
            break;
        ///////////////////////////////////////////////////////////////////////////////////
        case 'fetchCustomerGroups':
            $aResult['result'] = fetchCustomerGroups($accountID);
            break;
        ///////////////////////////////////////////////////////////////////////////////////
        case 'updateCustomerGroup':
            if( !isset($_POST['group']) || $_POST['group'] == "" || $_POST['group'] == null ) {
                $aResult['error'] = 'No customer group submitted!';
            }
            else {
                $aResult['result'] = updateCustomerGroup($accountID, $_POST['group']);
            }
            break;
        ///////////////////////////////////////////////////////////////////////////////////
        case 'createCustomerGroup':
            $aResult['result'] = createCustomerGroup($accountID);
            break;
        ///////////////////////////////////////////////////////////////////////////////////
        case 'deleteCustomerGroup':
            if( !isset($_POST['group']) || $_POST['group'] == "" || $_POST['group'] == null ) {
                $aResult['error'] = 'No customer group submitted!';
            }
            else {
                $aResult['result'] = deleteCustomerGroup($accountID, $_POST['group']);
            }
            break;
        ///////////////////////////////////////////////////////////////////////////////////
        case 'updateAllAppointments':
            if( !isset($_POST['customers']) || $_POST['customers'] == "" || $_POST['customers'] == null ) {
                $aResult['error'] = 'No customers submitted!';
            }
            elseif( !is_array($_POST['customers']) ) {
                $aResult['error'] = 'Parameter customers is not an array!';
            }
            else {
                $aResult['result'] = updateAllAppointments($accountID, $_POST['customers']);
            }
            break;
        ///////////////////////////////////////////////////////////////////////////////////
        default:
            $aResult['error'] = 'Function '.$_POST['function'].' not found!';
            break;
    }
}

echo json_encode($aResult);


///////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////


function fetchCustomers($accountID)
{
    global $mysqli;
    global $aResult;

    if ($stmt = $mysqli->prepare("SELECT
        customerID,
        optID,
        name,
        address,
        phone,
        areaofexpertise,
        visit,
        DATE_FORMAT(appointment,'%Y-%m-%d %H:%i'),
        hint,
        groupID,
        lat,
        lng
        FROM customers
        WHERE accountID = ?")
    ) {
        $stmt->bind_param('i', $accountID);
        $stmt->execute();
        $stmt->store_result();

        if ($stmt->num_rows > 0) {
            $stmt->bind_result($customerID, $optID, $name, $address, $phone, $areaofexpertise, $visit, $appointment, $hint, $groupID, $lat, $lng);

            $customers = array();
            while ($stmt->fetch()) {
                $customer['customerID'] = $customerID;
                $customer['optID'] = $optID;
                $customer['name'] = $name;
                $customer['address'] = $address;
                $customer['phone'] = $phone;
                $customer['areaofexpertise'] = $areaofexpertise;
                $customer['visit'] = $visit;
                $customer['appointment'] = $appointment;
                $customer['hint'] = $hint;
                $customer['groupID'] = $groupID;
                $customer['lat'] = $lat;
                $customer['lng'] = $lng;
                array_push($customers, $customer);
            }
            $stmt->close();

            return $customers;
        }
    }

    return null;
}


function updateCustomer($accountID, $customer, $editAllWithSameAddress)
{
    global $mysqli;
    global $aResult;

    // update all editable fields of the customer in the database
    if ($customer['visit'] == "") $customer['visit'] = null;
    if ($customer['appointment'] == "") $customer['appointment'] = null;
    if ($customer['hint'] == "") $customer['hint'] = null;
    if ($customer['groupID'] == "") $customer['groupID'] = null;
    if ($customer['lat'] == "") $customer['lat'] = null;
    if ($customer['lng'] == "") $customer['lng'] = null;

    if ($stmt = $mysqli->prepare("UPDATE customers SET
        name = ?,
        address = ?,
        phone = ?,
        visit = ?,
        appointment = ?,
        hint = ?,
        groupID = ?,
        lat = ?,
        lng = ?
        WHERE customerID = ? AND accountID = ?")
    ) {
        $stmt->bind_param('sssssssddii', $customer['name'], $customer['address'], $customer['phone'], $customer['visit'], $customer['appointment'], $customer['hint'], $customer['groupID'], $customer['lat'], $customer['lng'], $customer['customerID'], $accountID);
        $stmt->execute();
        $stmt->store_result();
        if (!$stmt) {
            $aResult['error'] = "Error updating customer with ID ".$customer['customerID'].". Error: " . $stmt->error;
            return false;
        }
        $stmt->close();
    }

    if ($editAllWithSameAddress) {
        if ($stmt = $mysqli->prepare("UPDATE customers SET
                                    visit = ?,
                                    groupID = ?
                                    WHERE address = ? AND accountID = ?")
                                    ) {
            $stmt->bind_param('sisi', $customer['visit'], $customer['groupID'], $customer['address'], $accountID);
            $stmt->execute();
            $stmt->store_result();
            if (!$stmt) {
                $aResult['error'] = "Error updating customer with ID ".$customer['customerID'].". Error: " . $stmt->error;
                return false;
            }
            $stmt->close();
        }
    }

    return true;
}


function updateAllAppointments($accountID, $customers) {
    global $mysqli;
    global $aResult;

    foreach ($customers as $customer) {
        if ($customer['appointment'] == "") $customer['appointment'] = null;

        if ($stmt = $mysqli->prepare("UPDATE customers SET appointment = ? WHERE customerID = ? AND accountID = ?")) {
            $stmt->bind_param('sii', $customer['appointment'], $customer['customerID'], $accountID);
            $stmt->execute();
            $stmt->store_result();
            if (!$stmt) {
                $aResult['error'] = "Error updating customer with ID ".$customer['customerID'].". Error: " . $stmt->error;
                return false;
            }
            $stmt->close();
        }
    }

    return true;
}


function fetchCustomerGroups($accountID)
{
    global $mysqli;

    if ($stmt = $mysqli->prepare("SELECT
        groupID,
        description,
        iconindex
        FROM customergroups
        WHERE accountID = ?")
    ) {
        $stmt->bind_param('i', $accountID);
        $stmt->execute();
        $stmt->store_result();

        if ($stmt->num_rows > 0) {
            $stmt->bind_result($groupID, $description, $iconindex);

            $customerGroups = array();
            while ($stmt->fetch()) {
                $group['groupID'] = intval($groupID);
                $group['description'] = $description;
                $group['iconindex'] = $iconindex;
                array_push($customerGroups, $group);
            }
            $stmt->close();

            return $customerGroups;
        }
    }

    return null;
}


function updateCustomerGroup($accountID, $group) {
    global $mysqli;
    global $aResult;

    // update all editable fields of the customer group in the database
    if ($stmt = $mysqli->prepare("UPDATE customergroups SET
        description = ?,
        iconindex = ?
        WHERE groupID = ? AND
        accountID = ?")
    ) {
        $stmt->bind_param('siii', $group['description'], $group['iconindex'], $group['groupID'], $accountID);
        $stmt->execute();
        $stmt->store_result();
        if (!$stmt) {
            $aResult['error'] = "Error updating customer group with ID ".$group['groupID'].". Error: " . $stmt->error;
            return false;
        }
        $stmt->close();
    }

    return true;
}


function createCustomerGroup($accountID) {
    global $mysqli;
    global $aResult;

    // default group parameters
    $description = "";
    $iconindex = 0;

    // create new entry in customergroups
    if ($stmt = $mysqli->prepare("INSERT INTO customergroups (accountID, description, iconindex) VALUES (?, ?, ?)")) {
        $stmt->bind_param('isi', $accountID, $description, $iconindex);
        $stmt->execute();
        $stmt->store_result();
        if (!$stmt) {
            $aResult['error'] = "Error creating new customer group. Error: " . $stmt->error;
            $stmt->close();
            return false;
        }
        $stmt->close();
    }

    // get ID of new group
    if ($stmt = $mysqli->prepare("SELECT LAST_INSERT_ID()")) {
        $stmt->execute();
        $stmt->store_result();
        $stmt->bind_result($groupID);
        $stmt->fetch();

        $group['groupID'] = intval($groupID);
        $group['description'] = $description;
        $group['iconindex'] = $iconindex;

        $stmt->close();

        return $group;
    }

    $aResult['error'] = "Error while selecting last inserted customer group. Error: " . $stmt->error;
    return false;
}


function deleteCustomerGroup($accountID, $group) {
    global $mysqli;
    global $aResult;

    // first find all customers that belong to the group and set their groupID to null
    if ($stmt = $mysqli->prepare("UPDATE customers SET groupID = NULL WHERE groupID = ? AND accountID = ?")
    ) {
        $stmt->bind_param('ii', $group['groupID'], $accountID);
        $stmt->execute();
        $stmt->store_result();
        if (!$stmt) {
            $aResult['error'] = "Error updating customers with groupID ".$group['groupID'].". Error: " . $stmt->error;
            return false;
        }
        $stmt->close();
    }

    // now the group is ready to be deleted from the customergroups table
    if ($stmt = $mysqli->prepare("DELETE FROM customergroups WHERE groupID = ? AND accountID = ?")) {
        $stmt->bind_param('ii', $group['groupID'], $accountID);
        $stmt->execute();
        $stmt->store_result();
        if (!$stmt) {
            $aResult['error'] = "Error deleting customer group with ID ".$group['groupID'].". Error: " . $stmt->error;
            $stmt->close();
            return false;
        }
        $stmt->close();
    }
    return true;
}
