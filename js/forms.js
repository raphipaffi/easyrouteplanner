function formhash(form, password) {
    // Create a new element input, this will be our hashed password field. 
    var p = document.createElement("input");

    // Add the new element to our form. 
    form.appendChild(p);
    p.name = "p";
    p.type = "hidden";
    p.value = hex_sha512(password.value);

    // Finally submit the form. 
    form.submit();
}


function regformhash(form, email, password, conf) {
    // Check each field has a value
    if (email.value == '') {
        alert('Fehler: Bitte geben Sie eine Emailadresse ein.');
        email.select();
        return false;
    }

    // verify password rules
    if ( verifyPasswordRules(password, conf) == false)
        return false;

    // Create a new element input, this will be our hashed password field. 
    var p = document.createElement("input");

    // Add the new element to our form. 
    form.appendChild(p);
    p.name = "p";
    p.type = "hidden";
    p.value = hex_sha512(password.value);

    // Make sure the plaintext password doesn't get sent. 
    password.value = "";
    conf.value = "";

    // Finally submit the form. 
    form.submit();
    return true;
}


function changepasswordformhash(password, conf) {
    // verify password rules
    if (verifyPasswordRules(password, conf) == false)
        return;

    // send hashed password to update user account
    $.post("includes/changePassword.php", {p: hex_sha512(password.value)},
        function(retVal) {
            if('error' in retVal) { alert(retVal.error); }
            else { alert("Passwort erfolgreich ge\xE4ndert."); }
        }
    );

    password.value = "";
    conf.value = "";
}


function verifyPasswordRules(password, conf) {
    // Check each field has a value
    if (password.value == '') {
        alert('Fehler: Bitte geben Sie ein Passwort ein.');
        password.select();
        return false;
    }

    // Check that the password is sufficiently long (min 6 chars)
    if (password.value.length < 6) {
        alert('Fehler: Das Passwort muss mindestens 6 Zeichen lang sein.');
        password.select();
        conf.value = "";
        return false;
    }

    // At least one number, one lowercase and one uppercase letter
    var re = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/;
    if (!re.test(password.value)) {
        alert('Fehler: Das Passwort muss mindestens eine Zahl, einen Klein- und einen Gro\xDFbuchstaben haben.');
        password.select();
        conf.value = "";
        return false;
    }

    if (conf.value == '') {
        alert('Fehler: Bitte best\xE4tigen Sie das Passwort.');
        conf.select();
        return false;
    }

    // Check password and confirmation are the same
    if (password.value != conf.value) {
        alert('Fehler: Die Best\xE4tigung stimmt nicht mit dem Passwort \xFCberein.');
        conf.select();
        return false;
    }

    return true;
}
