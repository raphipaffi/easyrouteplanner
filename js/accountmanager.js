
function initAccountManager() {
    $("#logoutButton").button().click(logout);

    $("#newPassword").on('keydown', function(e) { if (e.keyCode === 13) $('#changePasswordButton').click(); });
    $("#confirmPassword").on('keydown', function(e) { if (e.keyCode === 13) $('#changePasswordButton').click(); });
    $("#changePasswordButton").button().click(changePassword);
}


function changePassword() {
    var form = document.getElementById("changePassword_form");
    changepasswordformhash(form.newPassword, form.confirmPassword);
}


function logout() {
    window.location.replace("includes/logout.php");
    return false;
}
