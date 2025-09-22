/* form.js  - - - - - - - - - - - - - - - - - - - - - © 2021-2024 Chris Veness / Movable Type Ltd */

// add 'required' indicators for form labels
document.querySelectorAll('input[required], textarea[required], select[required]').forEach(function(i) {
    const prev = i.previousElementSibling;
    let prevLabel = prev;
    while (prevLabel?.nodeName!='LABEL' && prevLabel?.previousElementSibling && prevLabel?.previousElementSibling.nodeName!='LABEL') {
        prevLabel = prevLabel.previousElementSibling;
    }
    if (prevLabel?.innerHTML) prevLabel.innerHTML += '<sup class="required" title="required">*</sup>';
});

// indicate required validation directly on blur
document.querySelectorAll('input[required]').forEach(el => el.onblur = function() {
    if (!this.checkValidity()) this.style = 'box-shadow: 0 0 2px #ee0000';
});

// report postcode validity directly on blur
document.querySelectorAll('input[name$=post-code]').forEach(el => el.onblur = function() {
    this.value = this.value.toUpperCase();
    if (!this.checkValidity()) this.style = 'box-shadow: 0 0 2px #ee0000';
});

// if step is 3600, round datetime-local inputs to hours (i.e. minutes = 00) (why is this not default?)
document.querySelectorAll('input[type=datetime-local]').forEach(el => el.oninput = function() {
    if (this.step == 3600) this.value = this.value.split(':')[0]+':00';
});
