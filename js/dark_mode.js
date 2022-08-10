this.window.addEventListener("load", function () {
    document.querySelector("#dark-mode-checkbox").addEventListener("change", function () {
        if (this.checked) {
            document.body.classList.add("dark");
        } else {
            document.body.classList.remove("dark");
        }
    });

    let now = new Date();
    if (now.getHours() > 18) {
        document.querySelector("#dark-mode-checkbox").click();
    }
});
