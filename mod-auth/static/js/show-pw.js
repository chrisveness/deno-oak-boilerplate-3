/* show-pw  - - - - - - - - - - - - - - - - - - - - - © 2021-2024 Chris Veness / Movable Type Ltd */

// reveal or conceal password field
document.querySelector('#show-pw').onclick = function() {
    const pw = document.querySelector('#password');
    if (pw.type == 'password') {
        pw.type = 'text';
        this.title = 'hide password';
        this.classList.remove('fa-eye');
        this.classList.add('fa-eye-slash');
    } else {
        pw.type = 'password';
        this.title = 'show password';
        this.classList.remove('fa-eye-slash');
        this.classList.add('fa-eye');
    }
};
