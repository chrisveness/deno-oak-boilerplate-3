/* register/profile username available  - - - - - - - © 2021-2024 Chris Veness / Movable Type Ltd */

// check username available
document.querySelector('#username').onchange = async function() {
    const headers = { Accept: 'application/json' };
    const response = await fetch(`/register/available?username=${this.value}`, { headers, credentials: 'include' });
    if (!response.ok) {
        this.setCustomValidity('e-mail already registered');
        this.style = 'box-shadow: 0 0 2px #ee0000';
        document.querySelector('div.username-inuse').textContent = 'e-mail already registered';
        document.querySelector('button').disabled = true;
    } else {
        this.setCustomValidity('');
        this.style = 'box-shadow: revert';
        document.querySelector('div.username-inuse').textContent = '';
        document.querySelector('button').disabled = false;
    }
};
