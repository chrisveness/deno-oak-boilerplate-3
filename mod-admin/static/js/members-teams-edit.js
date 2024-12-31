/* admin/js/members-teams-edit.js - - - - - - - - - - - - © 2024 Chris Veness / Movable Type Ltd  */


document.querySelector('button.add-membership').onclick = function() {
    const select = document.querySelector('select.add-membership');
    select.classList.toggle('hide');
    select.focus();
};

document.querySelector('select.add-membership').onchange = async function addMembership() {
    const values = JSON.stringify({
        joinedOn: new Date(),
    });
    const [ tId, mId ] = this.value.split(':');
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
    const credentials = 'include';
    const response = await fetch(`/admin/teams/${tId}/members/${mId}`, { method: 'PUT', body: values, headers, credentials });

    if (!response.ok) return window.alert(`${response.statusText}: ${(await response.json()).message}`);

    // add new row (cloned from 1st membership row) & remove entry from select
    const body = await response.json();
    const tr = this.closest('tr');
    if (tr.nextElementSibling) {
        const newRow = tr.nextElementSibling.cloneNode(true);
        newRow.id = this.value;
        newRow.children[0].textContent = this.options[this.selectedIndex].label;
        newRow.querySelector('button').value = body.TeamMemberId;
        newRow.querySelector('button').onclick = deleteMembership; // onclick doesn't get cloned
        tr.insertAdjacentElement('afterend', newRow);
        this.remove(this.selectedIndex);
        this.classList.add('hide');
    } else {
        // TODO: no tr to clone - cop out & reload page for now... [implement as template?]
        window.location.reload();
    }
};

document.querySelectorAll('button.delete-membership').forEach(button => button.onclick = deleteMembership);
async function deleteMembership() { // eslint-disable-line jsdoc/require-jsdoc
    if (!window.confirm(`Are you sure you want to ${this.title}?`)) return;

    // delete member/team
    const [ tId, mId ] = this.id.split(':');
    const headers = { Accept: 'application/json' };
    const credentials = 'same-origin';
    const response = await fetch(`/admin/teams/${tId}/members/${mId}`, { method: 'DELETE', headers, credentials });
    if (!response.ok) return window.alert(`${response.statusText}: ${(await response.json()).message}`);

    // delete tr containing member/team
    const tr = this.closest('tr');
    const memberId = tr.id;
    const memberName = tr.children[0].textContent;
    const selector = this.closest('table').querySelector('select');
    const opt = document.createElement('option');
    opt.value = memberId;
    opt.text = memberName;
    selector.add(opt);
    tr.remove();
}

// escape will hide 'add-membership' select if it is displayed
document.onkeyup = function(event) {
    if (event.key == 'Escape') document.querySelector('select.add-membership').classList.add('hide');
};
