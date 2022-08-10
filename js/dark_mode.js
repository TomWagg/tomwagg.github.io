this.window.addEventListener("load", function () {
    document.querySelector("#dark-mode-checkbox").addEventListener("change", function () {
        if (this.checked) {
            document.body.classList.add("dark");
        } else {
            document.body.classList.remove("dark");
        }
    });
});
