"use strict";

/* =========================================================
   NetSpeed - Internet Speed Test
========================================================= */


/* =========================================================
   DOM
========================================================= */

const startTestBtn =
    document.getElementById("startTestBtn");

const speedValue =
    document.getElementById("speedValue");

const testType =
    document.getElementById("testType");

const statusText =
    document.getElementById("statusText");

const statusDot =
    document.getElementById("statusDot");

const progressBar =
    document.getElementById("progressBar");

const downloadValue =
    document.getElementById("downloadValue");

const uploadValue =
    document.getElementById("uploadValue");

const pingValue =
    document.getElementById("pingValue");

const ipAddress =
    document.getElementById("ipAddress");

const ispName =
    document.getElementById("ispName");

const locationName =
    document.getElementById("locationName");

const connectionType =
    document.getElementById("connectionType");

const themeToggle =
    document.getElementById("themeToggle");


/* =========================================================
   SETTINGS
========================================================= */

/*
   IMPORTANT:

   Browser-only speed tests cannot guarantee
   carrier-grade accuracy.

   The test uses a public test file.
*/

const DOWNLOAD_TEST_URL =
    "https://speed.cloudflare.com/__down?bytes=10000000";


/* =========================================================
   THEME
========================================================= */

function applyTheme(theme) {

    document.documentElement.setAttribute(
        "data-theme",
        theme
    );


    if (themeToggle) {

        themeToggle.textContent =
            theme === "light"
                ? "🌙"
                : "☀️";
    }


    localStorage.setItem(
        "netspeed_theme",
        theme
    );
}


const savedTheme =
    localStorage.getItem(
        "netspeed_theme"
    );


applyTheme(
    savedTheme === "light"
        ? "light"
        : "dark"
);


if (themeToggle) {

    themeToggle.addEventListener(
        "click",
        () => {

            const current =
                document.documentElement
                    .getAttribute("data-theme");


            applyTheme(
                current === "light"
                    ? "dark"
                    : "light"
            );
        }
    );
}


/* =========================================================
   CONNECTION INFORMATION
========================================================= */

async function loadConnectionInfo() {

    /*
       Network Information API
    */

    try {

        const connection =
            navigator.connection ||
            navigator.mozConnection ||
            navigator.webkitConnection;


        if (connection) {

            let type =
                connection.effectiveType
                    ?.toUpperCase() ||
                "Unknown";


            if (connection.type) {

                type +=
                    ` (${connection.type})`;
            }


            if (connectionType) {

                connectionType.textContent =
                    type;
            }

        } else {

            if (connectionType) {

                connectionType.textContent =
                    "Browser unavailable";
            }
        }


    } catch {

        if (connectionType) {

            connectionType.textContent =
                "Unknown";
        }
    }


    /*
       IP / ISP information
    */

    try {

        const response =
            await fetch(
                "https://ipapi.co/json/",
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "IP request failed"
            );
        }


        const data =
            await response.json();


        if (ipAddress) {

            ipAddress.textContent =
                data.ip ||
                "Unavailable";
        }


        if (ispName) {

            ispName.textContent =
                data.org ||
                "Unavailable";
        }


        if (locationName) {

            const city =
                data.city ||
                "";

            const country =
                data.country_name ||
                "";


            locationName.textContent =
                city && country
                    ? `${city}, ${country}`
                    : country ||
                      city ||
                      "Unavailable";
        }


    } catch (error) {

        console.warn(
            "Connection information error:",
            error
        );


        if (ipAddress) {

            ipAddress.textContent =
                "Unavailable";
        }


        if (ispName) {

            ispName.textContent =
                "Unavailable";
        }


        if (locationName) {

            locationName.textContent =
                "Unavailable";
        }
    }
}


/* =========================================================
   PING TEST
========================================================= */

async function testPing() {

    const samples = [];

    /*
       Small public endpoint.
       Multiple samples reduce random spikes.
    */

    const url =
        "https://www.cloudflare.com/cdn-cgi/trace";


    for (
        let i = 0;
        i < 5;
        i++
    ) {

        try {

            const start =
                performance.now();


            await fetch(
                `${url}?t=${Date.now()}-${i}`,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


            const end =
                performance.now();


            samples.push(
                end - start
            );


        } catch {

            // Ignore failed sample
        }
    }


    if (!samples.length) {

        return null;
    }


    samples.sort(
        (a, b) => a - b
    );


    /*
       Use median rather than first result.
    */

    const middle =
        Math.floor(
            samples.length / 2
        );


    return Math.round(
        samples[middle]
    );
}


/* =========================================================
   DOWNLOAD SPEED TEST
========================================================= */

async function testDownloadSpeed() {

    /*
       Add cache-busting query.
    */

    const url =
        `${DOWNLOAD_TEST_URL}&t=${Date.now()}`;


    const start =
        performance.now();


    const response =
        await fetch(
            url,
            {
                cache: "no-store"
            }
        );


    if (!response.ok) {

        throw new Error(
            "Download test failed."
        );
    }


    /*
       Read stream progressively.
    */

    if (
        !response.body ||
        !response.body.getReader
    ) {

        const blob =
            await response.blob();


        const end =
            performance.now();


        const seconds =
            (end - start) / 1000;


        const bits =
            blob.size * 8;


        return bits /
            seconds /
            1000000;
    }


    const reader =
        response.body.getReader();


    let receivedBytes = 0;

    let lastUpdate =
        performance.now();

    let lastBytes = 0;


    while (true) {

        const {
            done,
            value
        } =
            await reader.read();


        if (done) {
            break;
        }


        receivedBytes +=
            value.length;


        const now =
            performance.now();


        /*
           Update UI every ~200ms
        */

        if (
            now - lastUpdate >= 200
        ) {

            const elapsed =
                (now - start) / 1000;


            if (elapsed > 0) {

                const mbps =
                    (
                        receivedBytes *
                        8 /
                        elapsed /
                        1000000
                    );


                updateSpeedDisplay(
                    mbps
                );
            }


            /*
               Estimate progress.
            */

            const targetBytes =
                10000000;


            const progress =
                Math.min(
                    100,
                    (
                        receivedBytes /
                        targetBytes
                    ) * 100
                );


            setProgress(
                progress
            );


            lastUpdate =
                now;

            lastBytes =
                receivedBytes;
        }
    }


    const end =
        performance.now();


    const seconds =
        (end - start) / 1000;


    if (seconds <= 0) {

        return 0;
    }


    return (
        receivedBytes *
        8 /
        seconds /
        1000000
    );
}


/* =========================================================
   UPLOAD SPEED TEST
========================================================= */

async function testUploadSpeed() {

    /*
       Browser cannot reliably upload to an arbitrary
       server unless that server provides an upload endpoint.

       We use a public endpoint for an approximate test.
    */

    const size =
        2000000;


    const data =
        new Uint8Array(
            size
        );


    /*
       Fill buffer with data.
    */

    crypto.getRandomValues(
        data.subarray(
            0,
            Math.min(
                data.length,
                65536
            )
        )
    );


    /*
       Repeat the generated block.
    */

    for (
        let i = 65536;
        i < data.length;
        i += 65536
    ) {

        data.set(
            data.subarray(
                0,
                Math.min(
                    65536,
                    data.length
                )
            ),
            i
        );
    }


    const blob =
        new Blob(
            [data],
            {
                type:
                    "application/octet-stream"
            }
        );


    const start =
        performance.now();


    try {

        /*
           Cloudflare trace endpoint is NOT designed
           as a production upload benchmark.

           Therefore this test is marked approximate.
        */

        const response =
            await fetch(
                "https://speed.cloudflare.com/__up",
                {
                    method: "POST",

                    body: blob,

                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Upload endpoint unavailable."
            );
        }


        const end =
            performance.now();


        const seconds =
            (end - start) / 1000;


        if (seconds <= 0) {

            return 0;
        }


        return (
            size *
            8 /
            seconds /
            1000000
        );


    } catch (error) {

        console.warn(
            "Upload test failed:",
            error
        );


        return null;
    }
}


/* =========================================================
   RUN SPEED TEST
========================================================= */

async function startSpeedTest() {

    if (!startTestBtn) {
        return;
    }


    startTestBtn.disabled = true;


    resetResults();


    setStatus(
        "Testing connection...",
        "testing"
    );


    try {

        /* =========================================
           PING
        ========================================== */

        testType.textContent =
            "Ping";


        setProgress(
            10
        );


        const ping =
            await testPing();


        if (ping !== null) {

            pingValue.textContent =
                ping;
        }


        /* =========================================
           DOWNLOAD
        ========================================== */

        testType.textContent =
            "Download";


        setStatus(
            "Testing download speed...",
            "testing"
        );


        setProgress(
            20
        );


        const download =
            await testDownloadSpeed();


        const roundedDownload =
            Number(
                download.toFixed(2)
            );


        downloadValue.textContent =
            roundedDownload;


        updateSpeedDisplay(
            roundedDownload
        );


        /* =========================================
           UPLOAD
        ========================================== */

        testType.textContent =
            "Upload";


        setStatus(
            "Testing upload speed...",
            "testing"
        );


        setProgress(
            75
        );


        const upload =
            await testUploadSpeed();


        if (upload !== null) {

            const roundedUpload =
                Number(
                    upload.toFixed(2)
                );


            uploadValue.textContent =
                roundedUpload;
        } else {

            uploadValue.textContent =
                "N/A";
        }


        /* =========================================
           COMPLETE
        ========================================== */

        testType.textContent =
            "Complete";


        setProgress(
            100
        );


        setStatus(
            "Speed test completed",
            "success"
        );


        if (download > 0) {

            updateSpeedDisplay(
                Number(
                    download.toFixed(2)
                )
            );
        }


    } catch (error) {

        console.error(
            "SPEED TEST ERROR:",
            error
        );


        setStatus(
            "Speed test failed",
            "error"
        );


        testType.textContent =
            "Error";


        speedValue.textContent =
            "—";


    } finally {

        startTestBtn.disabled =
            false;


        setTimeout(
            () => {

                setProgress(
                    0
                );

            },
            1000
        );
    }
}


/* =========================================================
   SPEED DISPLAY
========================================================= */

function updateSpeedDisplay(
    speed
) {

    if (!speedValue) {
        return;
    }


    if (
        !Number.isFinite(speed)
    ) {

        speedValue.textContent =
            "0";

        return;
    }


    speedValue.textContent =
        speed < 10
            ? speed.toFixed(2)
            : Math.round(speed);
}


/* =========================================================
   STATUS
========================================================= */

function setStatus(
    text,
    state = "normal"
) {

    if (statusText) {

        statusText.textContent =
            text;
    }


    if (!statusDot) {
        return;
    }


    if (state === "testing") {

        statusDot.style.background =
            "#f59e0b";

        statusDot.style.boxShadow =
            "0 0 10px rgba(245,158,11,0.6)";

    } else if (state === "success") {

        statusDot.style.background =
            "#22c55e";

        statusDot.style.boxShadow =
            "0 0 10px rgba(34,197,94,0.6)";

    } else if (state === "error") {

        statusDot.style.background =
            "#ef4444";

        statusDot.style.boxShadow =
            "0 0 10px rgba(239,68,68,0.6)";

    } else {

        statusDot.style.background =
            "#22c55e";

        statusDot.style.boxShadow =
            "0 0 10px rgba(34,197,94,0.6)";
    }
}


/* =========================================================
   PROGRESS
========================================================= */

function setProgress(
    percent
) {

    if (!progressBar) {
        return;
    }


    const safe =
        Math.max(
            0,
            Math.min(
                100,
                percent
            )
        );


    progressBar.style.width =
        `${safe}%`;
}


/* =========================================================
   RESET RESULTS
========================================================= */

function resetResults() {

    if (speedValue) {
        speedValue.textContent =
            "0";
    }


    if (downloadValue) {
        downloadValue.textContent =
            "—";
    }


    if (uploadValue) {
        uploadValue.textContent =
            "—";
    }


    if (pingValue) {
        pingValue.textContent =
            "—";
    }


    if (testType) {
        testType.textContent =
            "Starting";
    }


    setProgress(
        0
    );
}


/* =========================================================
   START BUTTON
========================================================= */

if (startTestBtn) {

    startTestBtn.addEventListener(
        "click",
        startSpeedTest
    );
}


/* =========================================================
   PAGE LOAD
========================================================= */

loadConnectionInfo();


console.log(
    "NetSpeed loaded successfully."
);
