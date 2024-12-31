/* admin/js/members-list.js - - - - - - - - - - - - - - - © 2024 Chris Veness / Movable Type Ltd  */


document.querySelectorAll('button.op-delete').forEach(btn => btn.onclick = async function() {
    if (!window.confirm(`Are you sure you want to ${this.title}?`)) return;

    const resource = window.location.pathname.split('/').at(-1);
    const tr = this.closest('tr');
    const id = tr.id;
    const headers = { Accept: 'application/json' };
    const response = await fetch(`/admin/${resource}/${id}`, { method: 'DELETE', headers });
    if (!response.ok) return window.alert(`${(await response.json()).message}`);
    tr.remove();
});
