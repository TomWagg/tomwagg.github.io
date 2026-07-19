// Dark mode
// ---------
// By default the site follows the visitor's operating-system colour preference
// (`prefers-color-scheme`). If they flip the toggle we remember that explicit
// choice in localStorage and use it on every future visit. The theme is applied
// deterministically as soon as this script runs (it lives at the end of <body>),
// so refreshing never flips the theme, and a matching inline snippet at the top
// of each page applies it before the first paint to avoid a flash.
(function () {
    function storedTheme() {
        try {
            var v = localStorage.getItem('theme')
            return v === 'dark' || v === 'light' ? v : null
        } catch (e) {
            return null
        }
    }

    function systemPrefersDark() {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    function resolveTheme() {
        return storedTheme() || (systemPrefersDark() ? 'dark' : 'light')
    }

    function applyTheme(theme) {
        var dark = theme === 'dark'
        document.body.classList.toggle('dark', dark)
        document.documentElement.setAttribute('data-bs-theme', dark ? 'dark' : 'light')
        document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
        var checkbox = document.getElementById('dark-mode-checkbox')
        if (checkbox) checkbox.checked = dark
    }

    // Apply the current theme straight away.
    applyTheme(resolveTheme())

    // Remember the visitor's explicit choice when they use the toggle.
    var checkbox = document.getElementById('dark-mode-checkbox')
    if (checkbox) {
        checkbox.addEventListener('change', function () {
            var theme = this.checked ? 'dark' : 'light'
            try {
                localStorage.setItem('theme', theme)
            } catch (e) {}
            applyTheme(theme)
        })
    }

    // Keep following the OS preference live, unless the visitor has chosen a theme.
    if (window.matchMedia) {
        var mq = window.matchMedia('(prefers-color-scheme: dark)')
        var onSystemChange = function (e) {
            if (!storedTheme()) applyTheme(e.matches ? 'dark' : 'light')
        }
        if (mq.addEventListener) mq.addEventListener('change', onSystemChange)
        else if (mq.addListener) mq.addListener(onSystemChange)
    }
})()
