/* =========================================================
   5 STAR SCHOOL
   COMPLETE FRONTEND JAVASCRIPT
   ========================================================= */

"use strict";

/* =========================================================
   GLOBAL VARIABLES
   ========================================================= */

let token = localStorage.getItem("token") || "";

let students = [];
let classes = [];
let fees = [];
let payments = [];


/* =========================================================
   BASIC HELPERS
   ========================================================= */

function $(id) {
    return document.getElementById(id);
}


function setText(id, value) {
    const element = $(id);

    if (element) {
        element.textContent = value;
    }
}


function formatNumber(value) {
    const number = Number(value || 0);

    return number.toLocaleString("en-PK", {
        maximumFractionDigits: 2
    });
}


function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function showMessage(message, type = "success") {

    let box = $("globalMessage");

    if (!box) {

        box = document.createElement("div");

        box.id = "globalMessage";

        box.style.position = "fixed";
        box.style.top = "20px";
        box.style.right = "20px";
        box.style.zIndex = "99999";
        box.style.padding = "14px 20px";
        box.style.borderRadius = "10px";
        box.style.fontWeight = "600";
        box.style.boxShadow = "0 8px 25px rgba(0,0,0,.15)";
        box.style.maxWidth = "380px";

        document.body.appendChild(box);
    }

    box.textContent = message;

    if (type === "error") {

        box.style.background = "#fee2e2";
        box.style.color = "#991b1b";
        box.style.border = "1px solid #fecaca";

    } else {

        box.style.background = "#dcfce7";
        box.style.color = "#166534";
        box.style.border = "1px solid #bbf7d0";
    }

    clearTimeout(window.globalMessageTimer);

    window.globalMessageTimer = setTimeout(() => {

        if (box) {
            box.remove();
        }

    }, 3500);
}


/* =========================================================
   API
   ========================================================= */

async function api(url, options = {}) {

    const requestOptions = {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    };

    if (token) {
        requestOptions.headers.Authorization =
            `Bearer ${token}`;
    }

    let response;

    try {

        response = await fetch(
            url,
            requestOptions
        );

    } catch (error) {

        console.error(
            "Network error:",
            error
        );

        throw new Error(
            "Server se connection nahi ho raha. Check karein Node.js server running hai."
        );
    }

    const responseText =
        await response.text();

    let data = null;

    if (responseText) {

        try {

            data = JSON.parse(responseText);

        } catch {

            data = responseText;
        }
    }

    if (response.status === 401) {

        localStorage.removeItem("token");

        token = "";

        showLogin();

        throw new Error(
            "Session expired. Please login again."
        );
    }

    if (!response.ok) {

        let message = "Request failed";

        if (
            data &&
            typeof data === "object"
        ) {

            message =
                data.message ||
                data.error ||
                data.detail ||
                message;

        } else if (
            typeof data === "string" &&
            data.trim()
        ) {

            message = data;
        }

        throw new Error(message);
    }

    return data;
}


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        setupForms();

        const loader = $("loader");

        setTimeout(() => {

            if (loader) {
                loader.style.display = "none";
            }

        }, 800);

        if (token) {

            showMainApp();

            await initializeApp();

        } else {

            showLogin();
        }
    }
);


/* =========================================================
   FORM SETUP
   ========================================================= */

function setupForms() {

    const loginForm = $("loginForm");

    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                await login();
            }
        );
    }

    const studentForm = $("studentForm");

    if (studentForm) {

        studentForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                await addStudent();
            }
        );
    }

    const paymentForm = $("paymentForm");

    if (paymentForm) {

        paymentForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                await collectPayment();
            }
        );
    }
}


/* =========================================================
   SHOW LOGIN
   ========================================================= */

function showLogin() {

    const loginPage = $("loginPage");
    const app = $("app");

    if (loginPage) {

        loginPage.classList.remove("hidden");

        loginPage.style.display = "flex";
        loginPage.style.visibility = "visible";
        loginPage.style.opacity = "1";
    }

    if (app) {

        app.classList.add("hidden");

        app.style.display = "none";
    }
}


/* =========================================================
   SHOW MAIN APP
   ========================================================= */

function showMainApp() {

    const loginPage = $("loginPage");
    const app = $("app");

    if (loginPage) {

        loginPage.classList.add("hidden");

        loginPage.style.display = "none";
    }

    if (app) {

        app.classList.remove("hidden");

        app.style.display = "flex";
        app.style.visibility = "visible";
        app.style.opacity = "1";
    }
}


/* =========================================================
   LOGIN
   ========================================================= */

async function login() {

    const usernameInput = $("username");
    const passwordInput = $("password");
    const loginError = $("loginError");

    const username =
        usernameInput
            ? usernameInput.value.trim()
            : "";

    const password =
        passwordInput
            ? passwordInput.value
            : "";

    if (!username || !password) {

        if (loginError) {
            loginError.textContent =
                "Username aur password enter karein.";
        }

        return;
    }

    try {

        if (loginError) {
            loginError.textContent =
                "Logging in...";
        }

        const data = await api(
            "/api/login",
            {
                method: "POST",

                body: JSON.stringify({
                    username,
                    password
                })
            }
        );

        const receivedToken =
            data?.token ||
            data?.accessToken ||
            data?.jwt ||
            "";

        if (!receivedToken) {

            throw new Error(
                "Login successful but server ne token return nahi kiya."
            );
        }

        token = receivedToken;

        localStorage.setItem(
            "token",
            token
        );

        if (loginError) {
            loginError.textContent = "";
        }

        showMainApp();

        await initializeApp();

        showPage("dashboard");

    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        if (loginError) {

            loginError.textContent =
                error.message ||
                "Login failed.";
        }
    }
}


/* =========================================================
   LOGOUT
   ========================================================= */

function logout() {

    token = "";

    localStorage.removeItem("token");

    showLogin();
}


/* =========================================================
   INITIALIZE
   ========================================================= */

async function initializeApp() {

    console.log(
        "Initializing 5 STAR SCHOOL..."
    );

    await loadClasses();

    await loadStudents();

    await loadFees();

    await loadPayments();

    await loadDashboard();

    console.log(
        "5 STAR SCHOOL initialized successfully."
    );
}


/* =========================================================
   PAGE NAVIGATION
   ========================================================= */

function showPage(pageName) {

    const pages =
        document.querySelectorAll(".page");

    pages.forEach(page => {

        page.classList.add("hidden");

        page.style.display = "none";
    });

    const target = $(pageName);

    if (!target) {

        console.error(
            "Page not found:",
            pageName
        );

        return;
    }

    target.classList.remove("hidden");

    target.style.display = "block";

    const titles = {

        dashboard: "Dashboard",

        students: "Students",

        fees: "Monthly Fees",

        payments: "Payments",

        reports: "Reports"
    };

    setText(
        "pageTitle",
        titles[pageName] ||
        "5 STAR SCHOOL"
    );

    if (pageName === "students") {
        renderStudents(students);
    }

    if (pageName === "fees") {
        renderFees(fees);
    }

    if (pageName === "payments") {
        renderPayments(payments);
    }

    if (pageName === "reports") {
        updateReport();
    }
}


/* =========================================================
   SIDEBAR
   ========================================================= */

function toggleSidebar() {

    const sidebar = $("sidebar");

    if (!sidebar) {
        return;
    }

    sidebar.classList.toggle("open");
}


/* =========================================================
   THEME
   ========================================================= */

function toggleTheme() {

    document.body.classList.toggle(
        "dark-mode"
    );

    const darkMode =
        document.body.classList.contains(
            "dark-mode"
        );

    localStorage.setItem(
        "darkMode",
        darkMode ? "1" : "0"
    );
}


if (
    localStorage.getItem("darkMode") === "1"
) {

    document.body.classList.add(
        "dark-mode"
    );
}


/* =========================================================
   DASHBOARD
   ========================================================= */

async function loadDashboard() {

    try {

        const data =
            await api("/api/dashboard");

        if (data) {

            const totalStudents =
                data.totalStudents ??
                data.total_students ??
                data.students;

            const monthlyCollection =
                data.monthlyCollection ??
                data.monthly_collection ??
                data.collection;

            const pendingFees =
                data.pendingFees ??
                data.pending_fees ??
                data.pending;

            const todayCollection =
                data.todayCollection ??
                data.today_collection ??
                data.today;

            if (
                totalStudents !== undefined
            ) {

                setText(
                    "totalStudents",
                    formatNumber(
                        totalStudents
                    )
                );
            }

            if (
                monthlyCollection !== undefined
            ) {

                setText(
                    "monthlyCollection",
                    "Rs. " +
                    formatNumber(
                        monthlyCollection
                    )
                );
            }

            if (
                pendingFees !== undefined
            ) {

                setText(
                    "pendingFees",
                    "Rs. " +
                    formatNumber(
                        pendingFees
                    )
                );
            }

            if (
                todayCollection !== undefined
            ) {

                setText(
                    "todayCollection",
                    "Rs. " +
                    formatNumber(
                        todayCollection
                    )
                );
            }
        }

    } catch (error) {

        console.warn(
            "Dashboard API error:",
            error.message
        );

        setText(
            "totalStudents",
            formatNumber(
                students.length
            )
        );

        calculateDashboardFromFees();

        calculateDashboardFromPayments();
    }
}


/* =========================================================
   CLASSES
   ========================================================= */

async function loadClasses() {

    try {

        const data =
            await api("/api/classes");

        if (Array.isArray(data)) {

            classes = data;

        } else if (
            data &&
            Array.isArray(data.classes)
        ) {

            classes =
                data.classes;

        } else {

            classes = [];
        }

        renderClasses();

    } catch (error) {

        console.error(
            "Classes loading error:",
            error
        );

        classes = [];

        renderClasses();
    }
}


/* =========================================================
   RENDER CLASSES
   ========================================================= */

function renderClasses() {

    const select =
        $("classSelect");

    if (!select) {
        return;
    }

    select.innerHTML = `
        <option value="">
            Select Class
        </option>
    `;

    classes.forEach(
        classItem => {

            const option =
                document.createElement(
                    "option"
                );

            const id =
                classItem.id ??
                classItem.class_id ??
                "";

            const name =
                classItem.name ??
                classItem.class_name ??
                classItem.title ??
                classItem.class ??
                id;

            option.value = id;

            option.textContent = name;

            select.appendChild(
                option
            );
        }
    );
}


/* =========================================================
   GET CLASS NAME
   ========================================================= */

function getClassName(classId) {

    if (
        classId === null ||
        classId === undefined ||
        classId === ""
    ) {

        return "";
    }

    const found =
        classes.find(item => {

            const id =
                item.id ??
                item.class_id;

            return String(id) ===
                String(classId);
        });

    if (!found) {
        return String(classId);
    }

    return (
        found.name ??
        found.class_name ??
        found.title ??
        found.class ??
        classId
    );
}


/* =========================================================
   STUDENTS
   ========================================================= */

async function loadStudents() {

    try {

        console.log(
            "Loading students..."
        );

        const data =
            await api("/api/students");

        console.log(
            "Students API response:",
            data
        );

        if (Array.isArray(data)) {

            students = data;

        } else if (
            data &&
            Array.isArray(data.students)
        ) {

            students =
                data.students;

        } else if (
            data &&
            Array.isArray(data.data)
        ) {

            students =
                data.data;

        } else if (
            data &&
            Array.isArray(data.rows)
        ) {

            students =
                data.rows;

        } else {

            students = [];
        }

        console.log(
            "Students loaded:",
            students.length
        );

        renderStudents(students);

        setText(
            "totalStudents",
            formatNumber(
                students.length
            )
        );

    } catch (error) {

        console.error(
            "Students loading error:",
            error
        );

        students = [];

        const tbody =
            $("studentsTable");

        if (tbody) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="6"
                        style="
                            text-align:center;
                            color:#dc2626;
                            padding:20px;
                        ">
                        Unable to load students
                    </td>
                </tr>
            `;
        }
    }
}


/* =========================================================
   RENDER STUDENTS
   ========================================================= */

function renderStudents(
    list = students
) {

    const tbody =
        $("studentsTable");

    if (!tbody) {

        console.error(
            "studentsTable not found."
        );

        return;
    }

    tbody.innerHTML = "";

    if (
        !Array.isArray(list) ||
        list.length === 0
    ) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6"
                    style="
                        text-align:center;
                        padding:20px;
                    ">
                    No students found
                </td>
            </tr>
        `;

        return;
    }

    list.forEach(student => {

        const tr =
            document.createElement(
                "tr"
            );

        const studentId =
            student.student_id ??
            student.student_code ??
            student.registration_no ??
            student.id ??
            "";

        const name =
            student.name ??
            student.student_name ??
            "";

        const fatherName =
            student.father_name ??
            student.father ??
            student.parent_name ??
            "";

        let className =
            student.class_name ??
            student.class_title ??
            student.className ??
            student.class ??
            "";

        if (!className) {

            className =
                getClassName(
                    student.class_id
                );
        }

        const monthlyFee =
            student.monthly_fee ??
            student.fee ??
            student.monthlyFee ??
            0;

        const status =
            student.status ??
            "Active";

        tr.innerHTML = `

            <td>
                ${escapeHTML(studentId)}
            </td>

            <td>
                ${escapeHTML(name)}
            </td>

            <td>
                ${escapeHTML(fatherName)}
            </td>

            <td>
                ${escapeHTML(className)}
            </td>

            <td>
                Rs.
                ${formatNumber(
                    monthlyFee
                )}
            </td>

            <td>
                <span class="status active">
                    ${escapeHTML(status)}
                </span>
            </td>
        `;

        tbody.appendChild(tr);
    });
}


/* =========================================================
   ADD STUDENT
   ========================================================= */

async function addStudent() {

    const form =
        $("studentForm");

    if (!form) {
        return;
    }

    const formData =
        new FormData(form);

    const classValue =
        formData.get("class_id");

    const studentData = {

        student_id:
            String(
                formData.get(
                    "student_id"
                ) || ""
            ).trim(),

        name:
            String(
                formData.get(
                    "name"
                ) || ""
            ).trim(),

        father_name:
            String(
                formData.get(
                    "father_name"
                ) || ""
            ).trim(),

        mobile:
            String(
                formData.get(
                    "mobile"
                ) || ""
            ).trim(),

        roll_no:
            String(
                formData.get(
                    "roll_no"
                ) || ""
            ).trim(),

        class_id:
            classValue
                ? Number(classValue)
                : null,

        monthly_fee:
            Number(
                formData.get(
                    "monthly_fee"
                ) || 0
            ),

        discount:
            Number(
                formData.get(
                    "discount"
                ) || 0
            ),

        previous_balance:
            Number(
                formData.get(
                    "previous_balance"
                ) || 0
            )
    };

    if (
        !studentData.student_id
    ) {

        showMessage(
            "Student ID required.",
            "error"
        );

        return;
    }

    if (
        !studentData.name
    ) {

        showMessage(
            "Student name required.",
            "error"
        );

        return;
    }

    try {

        await api(
            "/api/students",
            {
                method: "POST",

                body:
                    JSON.stringify(
                        studentData
                    )
            }
        );

        showMessage(
            "Student successfully added."
        );

        form.reset();

        const feeInput =
            form.querySelector(
                '[name="monthly_fee"]'
            );

        if (feeInput) {
            feeInput.value = "3000";
        }

        const discountInput =
            form.querySelector(
                '[name="discount"]'
            );

        if (discountInput) {
            discountInput.value = "0";
        }

        const previousBalanceInput =
            form.querySelector(
                '[name="previous_balance"]'
            );

        if (previousBalanceInput) {
            previousBalanceInput.value = "0";
        }

        await loadStudents();

        await loadDashboard();

    } catch (error) {

        console.error(
            "Add student error:",
            error
        );

        showMessage(
            error.message ||
            "Student add nahi ho saka.",
            "error"
        );
    }
}


/* =========================================================
   SEARCH STUDENTS
   ========================================================= */

function filterStudents() {

    const searchInput =
        $("studentSearch");

    if (!searchInput) {
        return;
    }

    const search =
        searchInput.value
            .toLowerCase()
            .trim();

    if (!search) {

        renderStudents(
            students
        );

        return;
    }

    const filtered =
        students.filter(
            student => {

                const values = [

                    student.student_id,

                    student.student_code,

                    student.name,

                    student.student_name,

                    student.father_name,

                    student.mobile,

                    student.roll_no,

                    student.class_name,

                    student.class
                ];

                return values.some(
                    value =>
                        String(
                            value ?? ""
                        )
                            .toLowerCase()
                            .includes(search)
                );
            }
        );

    renderStudents(
        filtered
    );
}


/* =========================================================
   MONTHLY FEES
   ========================================================= */

async function loadFees() {

    try {

        console.log(
            "Loading fee records..."
        );

        const data =
            await api("/api/fees");

        if (Array.isArray(data)) {

            fees = data;

        } else if (
            data &&
            Array.isArray(data.fees)
        ) {

            fees =
                data.fees;

        } else if (
            data &&
            Array.isArray(data.data)
        ) {

            fees =
                data.data;

        } else if (
            data &&
            Array.isArray(data.rows)
        ) {

            fees =
                data.rows;

        } else {

            fees = [];
        }

        console.log(
            "Fee records loaded:",
            fees.length
        );

        renderFees(
            fees
        );

        calculateDashboardFromFees();

    } catch (error) {

        console.error(
            "Fees loading error:",
            error
        );

        fees = [];

        renderFees([]);
    }
}


/* =========================================================
   RENDER FEES
   ========================================================= */

function renderFees(
    list = fees
) {

    const tbody =
        $("feesTable");

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    if (
        !Array.isArray(list) ||
        list.length === 0
    ) {

        tbody.innerHTML = `
            <tr>
                <td colspan="8"
                    style="
                        text-align:center;
                        padding:20px;
                    ">
                    No fee records found
                </td>
            </tr>
        `;

        return;
    }

    list.forEach(fee => {

        const tr =
            document.createElement(
                "tr"
            );

        const feeRecordId =
            fee.id ??
            fee.fee_record_id ??
            "";

        const invoice =
            fee.invoice_no ??
            fee.invoice ??
            fee.invoice_number ??
            feeRecordId ??
            "";

        const studentName =
            fee.student_name ??
            fee.name ??
            fee.student ??
            "";

        const month =
            fee.month ??
            fee.fee_month ??
            fee.billing_month ??
            "";

        const total =
            fee.total ??
            fee.total_amount ??
            fee.amount ??
            fee.monthly_fee ??
            0;

        const paid =
            fee.paid ??
            fee.paid_amount ??
            0;

        const remaining =
            fee.remaining ??
            fee.remaining_amount ??
            Math.max(
                Number(total) -
                Number(paid),
                0
            );

        const status =
            fee.status ??
            (
                Number(remaining) <= 0
                    ? "PAID"
                    : "PENDING"
            );

        const statusUpper =
            String(
                status
            ).toUpperCase();

        let action = "";

        if (
            Number(remaining) > 0 &&
            feeRecordId
        ) {

            action = `

                <button
                    type="button"
                    onclick="selectFeeForPayment(
                        ${Number(feeRecordId)},
                        ${Number(remaining)}
                    )"
                    style="
                        background:#2563eb;
                        color:#fff;
                        border:none;
                        padding:7px 12px;
                        border-radius:7px;
                        cursor:pointer;
                        font-weight:600;
                    "
                >
                    💳 Collect
                </button>

            `;

        } else if (
            Number(remaining) <= 0
        ) {

            action = `

                <span style="
                    color:#16a34a;
                    font-weight:700;
                ">
                    ✓ Paid
                </span>

            `;

        } else {

            action = `

                <span style="
                    color:#dc2626;
                ">
                    Invalid Fee ID
                </span>

            `;
        }

        tr.innerHTML = `

            <td>
                ${escapeHTML(invoice)}
            </td>

            <td>
                ${escapeHTML(studentName)}
            </td>

            <td>
                ${escapeHTML(month)}
            </td>

            <td>
                Rs.
                ${formatNumber(total)}
            </td>

            <td>
                Rs.
                ${formatNumber(paid)}
            </td>

            <td>
                Rs.
                ${formatNumber(remaining)}
            </td>

            <td>
                ${escapeHTML(
                    statusUpper
                )}
            </td>

            <td>
                ${action}
            </td>

        `;

        tbody.appendChild(tr);
    });
}


/* =========================================================
   SELECT FEE FOR PAYMENT
   ========================================================= */

function selectFeeForPayment(
    feeId,
    remaining
) {

    const feeInput =
        $("feeRecordId");

    const amountInput =
        $("paymentAmount");

    if (!feeInput) {

        showMessage(
            "Fee Record ID field nahi mila.",
            "error"
        );

        return;
    }

    if (!amountInput) {

        showMessage(
            "Payment amount field nahi mila.",
            "error"
        );

        return;
    }

    feeInput.value =
        Number(feeId);

    amountInput.value =
        Number(remaining);

    showPage(
        "payments"
    );

    showPaymentMessage(
        "Fee selected. Remaining amount Rs. " +
        formatNumber(
            remaining
        ) +
        " ready hai.",
        "success"
    );

    amountInput.focus();
}


/* =========================================================
   GENERATE MONTHLY FEES
   ========================================================= */

async function generateFees() {

    const confirmed =
        confirm(
            "Current month ki fees generate karni hain?"
        );

    if (!confirmed) {
        return;
    }

    try {

        showMessage(
            "Monthly fees generate ho rahi hain..."
        );

        const data =
            await api(
                "/api/fees/generate",
                {
                    method: "POST",

                    body: JSON.stringify({})
                }
            );

        console.log(
            "Fee generation response:",
            data
        );

        showMessage(
            "Monthly fees successfully generated."
        );

        await loadFees();

        await loadPayments();

        await loadDashboard();

        showPage(
            "fees"
        );

    } catch (error) {

        console.error(
            "Generate fees error:",
            error
        );

        showMessage(
            error.message ||
            "Fees generate nahi ho sakin.",
            "error"
        );
    }
}


/* =========================================================
   PAYMENTS
   ========================================================= */

async function loadPayments() {

    try {

        const data =
            await api("/api/payments");

        if (Array.isArray(data)) {

            payments = data;

        } else if (
            data &&
            Array.isArray(
                data.payments
            )
        ) {

            payments =
                data.payments;

        } else if (
            data &&
            Array.isArray(
                data.data
            )
        ) {

            payments =
                data.data;

        } else if (
            data &&
            Array.isArray(
                data.rows
            )
        ) {

            payments =
                data.rows;

        } else {

            payments = [];
        }

        renderPayments(
            payments
        );

        calculateDashboardFromPayments();

    } catch (error) {

        console.error(
            "Payments loading error:",
            error
        );

        payments = [];

        renderPayments([]);
    }
}


/* =========================================================
   RENDER PAYMENTS
   ========================================================= */

function renderPayments(
    list = payments
) {

    const tbody =
        $("paymentsTable");

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    if (
        !Array.isArray(list) ||
        list.length === 0
    ) {

        tbody.innerHTML = `
            <tr>
                <td colspan="5"
                    style="
                        text-align:center;
                        padding:20px;
                    ">
                    No payments found
                </td>
            </tr>
        `;

        return;
    }

    list.forEach(payment => {

        const tr =
            document.createElement(
                "tr"
            );

        const receipt =
            payment.receipt_no ??
            payment.receipt ??
            payment.receipt_number ??
            payment.id ??
            "";

        const studentName =
            payment.student_name ??
            payment.name ??
            payment.student ??
            "";

        const amount =
            payment.amount ??
            payment.paid_amount ??
            payment.payment_amount ??
            0;

        const method =
            payment.payment_method ??
            payment.method ??
            "Cash";

        const date =
            payment.payment_date ??
            payment.date ??
            payment.created_at ??
            "";

        tr.innerHTML = `

            <td>
                ${escapeHTML(receipt)}
            </td>

            <td>
                ${escapeHTML(studentName)}
            </td>

            <td>
                Rs.
                ${formatNumber(amount)}
            </td>

            <td>
                ${escapeHTML(method)}
            </td>

            <td>
                ${escapeHTML(
                    formatDate(date)
                )}
            </td>

        `;

        tbody.appendChild(tr);
    });
}


/* =========================================================
   FIND SELECTED FEE
   ========================================================= */

function findFeeRecord(feeId) {

    if (!Array.isArray(fees)) {
        return null;
    }

    return fees.find(fee => {

        const id =
            fee.id ??
            fee.fee_record_id ??
            "";

        return Number(id) === Number(feeId);
    }) || null;
}


/* =========================================================
   FIND STUDENT
   ========================================================= */

function findStudentFromFee(fee) {

    if (!fee) {
        return null;
    }

    const studentId =
        fee.student_id ??
        fee.studentId ??
        fee.student?.id ??
        fee.student?.student_id ??
        null;

    if (
        studentId !== null &&
        studentId !== undefined
    ) {

        const found =
            students.find(student => {

                const id =
                    student.id ??
                    student.student_id ??
                    student.student_code ??
                    "";

                return String(id) ===
                    String(studentId);
            });

        if (found) {
            return found;
        }
    }

    const feeStudentName =
        fee.student_name ??
        fee.name ??
        fee.student ??
        "";

    if (feeStudentName) {

        const found =
            students.find(student => {

                const name =
                    student.name ??
                    student.student_name ??
                    "";

                return String(name).toLowerCase() ===
                    String(feeStudentName).toLowerCase();
            });

        if (found) {
            return found;
        }
    }

    return null;
}


/* =========================================================
   COLLECT PAYMENT
   ========================================================= */

async function collectPayment() {

    const feeRecordInput =
        $("feeRecordId");

    const amountInput =
        $("paymentAmount");

    const methodInput =
        $("paymentMethod");

    const feeId =
        Number(
            feeRecordInput?.value || 0
        );

    const amount =
        Number(
            amountInput?.value || 0
        );

    const method =
        methodInput?.value ||
        "Cash";

    if (!feeId) {

        showPaymentMessage(
            "Fee Record ID required.",
            "error"
        );

        return;
    }

    if (
        !amount ||
        amount <= 0
    ) {

        showPaymentMessage(
            "Valid payment amount enter karein.",
            "error"
        );

        return;
    }


    /*
     * IMPORTANT:
     * Payment se pehle selected fee record
     * find kar rahe hain.
     */

    const selectedFee =
        findFeeRecord(feeId);


    /*
     * Selected fee se student find karein.
     */

    const selectedStudent =
        findStudentFromFee(
            selectedFee
        );


    /*
     * Student information.
     *
     * Pehle fee record check hoga,
     * phir students array.
     */

    const receiptStudentName =
        selectedStudent?.name ??
        selectedStudent?.student_name ??
        selectedFee?.student_name ??
        selectedFee?.name ??
        selectedFee?.student ??
        "";


    const receiptFatherName =
        selectedStudent?.father_name ??
        selectedStudent?.father ??
        selectedStudent?.parent_name ??
        selectedFee?.father_name ??
        selectedFee?.father ??
        "";


    const receiptStudentId =
        selectedStudent?.student_id ??
        selectedStudent?.student_code ??
        selectedStudent?.registration_no ??
        selectedStudent?.id ??
        selectedFee?.student_id ??
        "";


    let receiptClass =
        selectedStudent?.class_name ??
        selectedStudent?.class_title ??
        selectedStudent?.className ??
        selectedStudent?.class ??
        selectedFee?.class_name ??
        selectedFee?.class ??
        "";


    if (
        !receiptClass &&
        selectedStudent?.class_id
    ) {

        receiptClass =
            getClassName(
                selectedStudent.class_id
            );
    }


    try {

        const paymentData = {

            fee_record_id:
                feeId,

            amount:
                amount,

            payment_method:
                method
        };


        console.log(
            "Sending payment:",
            paymentData
        );


        const data =
            await api(
                "/api/payments",
                {
                    method: "POST",

                    body:
                        JSON.stringify(
                            paymentData
                        )
                }
            );


        console.log(
            "Payment response:",
            data
        );


        /*
         * IMPORTANT RECEIPT OBJECT
         *
         * Backend response + selected
         * student information.
         */

        window.lastReceipt = {

            ...(data || {}),

            receipt_no:
                data?.receipt_no ||
                data?.receipt ||
                data?.receipt_number ||
                "",

            student_name:
                data?.student_name ||
                data?.name ||
                receiptStudentName ||
                "",

            name:
                data?.name ||
                data?.student_name ||
                receiptStudentName ||
                "",

            father_name:
                data?.father_name ||
                receiptFatherName ||
                "",

            student_id:
                data?.student_id ||
                receiptStudentId ||
                "",

            class_name:
                data?.class_name ||
                receiptClass ||
                "",

            amount:
                Number(
                    data?.amount ??
                    amount
                ),

            payment_method:
                data?.payment_method ||
                data?.method ||
                method,

            payment_date:
                data?.payment_date ||
                data?.date ||
                data?.created_at ||
                new Date().toISOString()
        };


        console.log(
            "FINAL RECEIPT DATA:",
            window.lastReceipt
        );


        showPaymentMessage(
            "Payment successfully collected.",
            "success"
        );


        if (feeRecordInput) {
            feeRecordInput.value = "";
        }


        if (amountInput) {
            amountInput.value = "";
        }


        await loadFees();

        await loadPayments();

        await loadDashboard();


        /*
         * Print receipt
         */

        if (
            data &&
            (
                data.receipt_no ||
                data.receipt ||
                data.receipt_number
            )
        ) {

            const printNow =
                confirm(
                    "Payment successful!\n\n" +
                    "Receipt No: " +
                    (
                        window.lastReceipt.receipt_no ||
                        "N/A"
                    ) +
                    "\n\nReceipt print karni hai?"
                );


            if (printNow) {

                printReceipt(
                    window.lastReceipt
                );
            }
        } else {

            /*
             * Agar backend receipt number
             * na bheje tab bhi receipt print
             * ki ja sakti hai.
             */

            const printNow =
                confirm(
                    "Payment successful!\n\nReceipt print karni hai?"
                );


            if (printNow) {

                printReceipt(
                    window.lastReceipt
                );
            }
        }


    } catch (error) {

        console.error(
            "Payment error:",
            error
        );

        showPaymentMessage(
            error.message ||
            "Payment collect nahi ho saka.",
            "error"
        );
    }
}


/* =========================================================
   PAYMENT MESSAGE
   ========================================================= */

function showPaymentMessage(
    message,
    type = "success"
) {

    const box =
        $("paymentMessage");

    if (!box) {

        showMessage(
            message,
            type === "error"
                ? "error"
                : "success"
        );

        return;
    }

    box.textContent =
        message;

    box.style.marginTop =
        "10px";

    box.style.padding =
        "10px";

    box.style.borderRadius =
        "8px";

    if (
        type === "error"
    ) {

        box.style.background =
            "#fee2e2";

        box.style.color =
            "#991b1b";

    } else {

        box.style.background =
            "#dcfce7";

        box.style.color =
            "#166534";
    }
}


/* =========================================================
   DASHBOARD FROM FEES
   ========================================================= */

function calculateDashboardFromFees() {

    if (
        !Array.isArray(fees)
    ) {
        return;
    }

    let pending = 0;

    fees.forEach(fee => {

        const total =
            Number(
                fee.total ??
                fee.total_amount ??
                fee.amount ??
                fee.monthly_fee ??
                0
            );

        const paid =
            Number(
                fee.paid ??
                fee.paid_amount ??
                0
            );

        const remaining =
            fee.remaining !== undefined
                ? Number(
                    fee.remaining
                )
                : Math.max(
                    total - paid,
                    0
                );

        pending +=
            remaining;
    });

    setText(
        "pendingFees",
        "Rs. " +
        formatNumber(
            pending
        )
    );
}


/* =========================================================
   DASHBOARD FROM PAYMENTS
   ========================================================= */

function calculateDashboardFromPayments() {

    if (
        !Array.isArray(payments)
    ) {
        return;
    }

    let total = 0;

    payments.forEach(
        payment => {

            total += Number(
                payment.amount ??
                payment.paid_amount ??
                payment.payment_amount ??
                0
            );
        }
    );

    setText(
        "monthlyCollection",
        "Rs. " +
        formatNumber(total)
    );


    const today =
        new Date()
            .toISOString()
            .slice(0, 10);

    let todayTotal = 0;

    payments.forEach(
        payment => {

            const date =
                payment.payment_date ??
                payment.date ??
                payment.created_at ??
                "";

            if (
                date &&
                String(date)
                    .slice(0, 10) ===
                today
            ) {

                todayTotal += Number(
                    payment.amount ??
                    payment.paid_amount ??
                    payment.payment_amount ??
                    0
                );
            }
        }
    );

    setText(
        "todayCollection",
        "Rs. " +
        formatNumber(
            todayTotal
        )
    );
}


/* =========================================================
   DATE FORMAT
   ========================================================= */

function formatDate(value) {

    if (!value) {
        return "";
    }

    try {

        const date =
            new Date(value);

        if (
            isNaN(
                date.getTime()
            )
        ) {

            return String(value);
        }

        return date.toLocaleDateString(
            "en-PK",
            {
                year: "numeric",
                month: "short",
                day: "numeric"
            }
        );

    } catch {

        return String(value);
    }
}


/* =========================================================
   REPORT
   ========================================================= */

function updateReport() {

    const report =
        $("reportContent");

    if (!report) {
        return;
    }

    let totalCollection = 0;

    let totalPending = 0;

    payments.forEach(
        payment => {

            totalCollection +=
                Number(
                    payment.amount ??
                    payment.paid_amount ??
                    payment.payment_amount ??
                    0
                );
        }
    );

    fees.forEach(
        fee => {

            const total =
                Number(
                    fee.total ??
                    fee.total_amount ??
                    fee.amount ??
                    fee.monthly_fee ??
                    0
                );

            const paid =
                Number(
                    fee.paid ??
                    fee.paid_amount ??
                    0
                );

            const remaining =
                fee.remaining !== undefined
                    ? Number(
                        fee.remaining
                    )
                    : Math.max(
                        total - paid,
                        0
                    );

            totalPending +=
                remaining;
        }
    );

    report.innerHTML = `

        <div style="
            text-align:center;
            margin-bottom:25px;
        ">

            <h2 style="
                margin-bottom:5px;
            ">
                5 STAR SCHOOL
            </h2>

            <h3>
                Monthly Fee Collection Report
            </h3>

            <p>
                Current records are loaded directly from PostgreSQL.
            </p>

            <p>
                Date:
                ${escapeHTML(
                    new Date().toLocaleDateString(
                        "en-PK"
                    )
                )}
            </p>

        </div>

        <div style="
            display:grid;
            grid-template-columns:
                repeat(3,1fr);
            gap:15px;
            margin-bottom:25px;
        ">

            <div style="
                border:1px solid #ddd;
                padding:15px;
                text-align:center;
            ">

                <strong>
                    Total Students
                </strong>

                <h2>
                    ${formatNumber(
                        students.length
                    )}
                </h2>

            </div>

            <div style="
                border:1px solid #ddd;
                padding:15px;
                text-align:center;
            ">

                <strong>
                    Collection
                </strong>

                <h2>
                    Rs.
                    ${formatNumber(
                        totalCollection
                    )}
                </h2>

            </div>

            <div style="
                border:1px solid #ddd;
                padding:15px;
                text-align:center;
            ">

                <strong>
                    Pending
                </strong>

                <h2>
                    Rs.
                    ${formatNumber(
                        totalPending
                    )}
                </h2>

            </div>

        </div>

        <table style="
            width:100%;
            border-collapse:collapse;
        ">

            <thead>

                <tr>

                    <th style="
                        border:1px solid #ccc;
                        padding:8px;
                    ">
                        Receipt
                    </th>

                    <th style="
                        border:1px solid #ccc;
                        padding:8px;
                    ">
                        Student
                    </th>

                    <th style="
                        border:1px solid #ccc;
                        padding:8px;
                    ">
                        Amount
                    </th>

                    <th style="
                        border:1px solid #ccc;
                        padding:8px;
                    ">
                        Method
                    </th>

                    <th style="
                        border:1px solid #ccc;
                        padding:8px;
                    ">
                        Date
                    </th>

                </tr>

            </thead>

            <tbody>

                ${
                    payments.length
                    ?
                    payments.map(
                        payment => {

                            const receipt =
                                payment.receipt_no ??
                                payment.receipt ??
                                payment.id ??
                                "";

                            const studentName =
                                payment.student_name ??
                                payment.name ??
                                payment.student ??
                                "";

                            const amount =
                                payment.amount ??
                                payment.paid_amount ??
                                payment.payment_amount ??
                                0;

                            const method =
                                payment.payment_method ??
                                payment.method ??
                                "";

                            const date =
                                payment.payment_date ??
                                payment.date ??
                                payment.created_at ??
                                "";

                            return `

                                <tr>

                                    <td style="
                                        border:1px solid #ccc;
                                        padding:8px;
                                    ">
                                        ${escapeHTML(
                                            receipt
                                        )}
                                    </td>

                                    <td style="
                                        border:1px solid #ccc;
                                        padding:8px;
                                    ">
                                        ${escapeHTML(
                                            studentName
                                        )}
                                    </td>

                                    <td style="
                                        border:1px solid #ccc;
                                        padding:8px;
                                    ">
                                        Rs.
                                        ${formatNumber(
                                            amount
                                        )}
                                    </td>

                                    <td style="
                                        border:1px solid #ccc;
                                        padding:8px;
                                    ">
                                        ${escapeHTML(
                                            method
                                        )}
                                    </td>

                                    <td style="
                                        border:1px solid #ccc;
                                        padding:8px;
                                    ">
                                        ${escapeHTML(
                                            formatDate(
                                                date
                                            )
                                        )}
                                    </td>

                                </tr>

                            `;
                        }
                    ).join("")
                    :
                    `
                        <tr>

                            <td colspan="5"
                                style="
                                    text-align:center;
                                    padding:15px;
                                ">

                                No payment records

                            </td>

                        </tr>
                    `
                }

            </tbody>

        </table>
    `;
}


/* =========================================================
   PRINT REPORT
   ========================================================= */

function printReport() {

    updateReport();

    const reportContent =
        $("reportContent");

    if (!reportContent) {

        showMessage(
            "Report content not found.",
            "error"
        );

        return;
    }

    const printWindow =
        window.open(
            "",
            "_blank",
            "width=1000,height=700"
        );

    if (!printWindow) {

        showMessage(
            "Popup blocked hai. Browser mein popup allow karein.",
            "error"
        );

        return;
    }

    printWindow.document.write(`

        <!DOCTYPE html>

        <html>

        <head>

            <title>
                5 STAR SCHOOL - Monthly Fee Report
            </title>

            <meta charset="UTF-8">

            <style>

                body {
                    font-family: Arial, sans-serif;
                    padding: 30px;
                    color: #111;
                    background: #fff;
                }

                h2,
                h3,
                p {
                    text-align: center;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }

                th,
                td {
                    border: 1px solid #ccc;
                    padding: 8px;
                    text-align: left;
                }

                th {
                    font-weight: bold;
                }

                @media print {

                    body {
                        padding: 10px;
                    }
                }

            </style>

        </head>

        <body>

            ${reportContent.innerHTML}

        </body>

        </html>
    `);

    printWindow.document.close();

    printWindow.onload =
        function () {

            printWindow.focus();

            printWindow.print();
        };
}


/* =========================================================
   PRINT RECEIPT
   ========================================================= */

function printReceipt(
    payment = null
) {

    const data =
        payment ||
        window.lastReceipt;

    if (!data) {

        showMessage(
            "Print karne ke liye receipt data available nahi hai.",
            "error"
        );

        return;
    }


    /* =====================================================
       RECEIPT DATA
       ===================================================== */

    const receipt =
        data.receipt_no ??
        data.receipt ??
        data.receipt_number ??
        data.id ??
        "";


    const studentName =
        data.student_name ??
        data.name ??
        data.student ??
        "N/A";


    const fatherName =
        data.father_name ??
        data.father ??
        data.parent_name ??
        "N/A";


    const studentId =
        data.student_id ??
        data.student_code ??
        data.registration_no ??
        "";


    const className =
        data.class_name ??
        data.class ??
        data.class_title ??
        "";


    const amount =
        data.amount ??
        data.paid_amount ??
        data.payment_amount ??
        0;


    const method =
        data.payment_method ??
        data.method ??
        "Cash";


    const date =
        data.payment_date ??
        data.date ??
        data.created_at ??
        new Date();


    const month =
        data.month ??
        data.fee_month ??
        data.billing_month ??
        "";


    const printWindow =
        window.open(
            "",
            "_blank",
            "width=550,height=800"
        );


    if (!printWindow) {

        showMessage(
            "Popup blocked hai.",
            "error"
        );

        return;
    }


    /* =====================================================
       RECEIPT HTML
       ===================================================== */

    printWindow.document.write(`

        <!DOCTYPE html>

        <html>

        <head>

            <meta charset="UTF-8">

            <title>
                Fee Receipt - 5 STAR SCHOOL
            </title>

            <style>

                * {
                    box-sizing: border-box;
                }

                body {

                    font-family:
                        Arial,
                        Helvetica,
                        sans-serif;

                    margin: 0;

                    padding: 25px;

                    color: #111;

                    background: #fff;
                }


                .receipt {

                    width: 100%;

                    max-width: 500px;

                    margin: auto;

                    border: 2px solid #111;

                    padding: 25px;

                    background: #fff;
                }


                .school-name {

                    text-align: center;

                    font-size: 27px;

                    font-weight: 800;

                    margin-bottom: 5px;
                }


                .receipt-title {

                    text-align: center;

                    font-size: 20px;

                    font-weight: 700;

                    margin-bottom: 5px;
                }


                .subtitle {

                    text-align: center;

                    color: #555;

                    font-size: 13px;

                    margin-bottom: 20px;
                }


                .line {

                    border-top: 1px solid #222;

                    margin: 15px 0;
                }


                .row {

                    display: flex;

                    justify-content:
                        space-between;

                    align-items: center;

                    gap: 20px;

                    border-bottom:
                        1px solid #ddd;

                    padding: 10px 0;

                    font-size: 14px;
                }


                .row strong {

                    min-width: 130px;
                }


                .row span {

                    text-align: right;

                    font-weight: 600;

                    word-break: break-word;
                }


                .student-box {

                    border:
                        1px solid #bbb;

                    padding: 12px;

                    margin: 15px 0;
                }


                .amount-box {

                    text-align: center;

                    border:
                        2px solid #111;

                    padding: 15px;

                    margin: 20px 0;
                }


                .amount-label {

                    font-size: 14px;

                    font-weight: 600;
                }


                .amount {

                    font-size: 30px;

                    font-weight: 800;

                    margin-top: 5px;
                }


                .thankyou {

                    text-align: center;

                    margin-top: 25px;

                    font-size: 13px;

                    color: #444;
                }


                .signature {

                    display: flex;

                    justify-content:
                        space-between;

                    margin-top: 45px;

                    font-size: 12px;
                }


                .signature div {

                    width: 40%;

                    text-align: center;

                    border-top:
                        1px solid #111;

                    padding-top: 6px;
                }


                @media print {

                    body {

                        padding: 0;
                    }

                    .receipt {

                        border: 2px solid #111;

                        max-width: 100%;
                    }
                }

            </style>

        </head>


        <body>

            <div class="receipt">


                <div class="school-name">

                    ★ 5 STAR SCHOOL

                </div>


                <div class="receipt-title">

                    FEE RECEIPT

                </div>


                <div class="subtitle">

                    Monthly Fee Billing System

                </div>


                <div class="line"></div>


                <div class="row">

                    <strong>
                        Receipt No:
                    </strong>

                    <span>
                        ${escapeHTML(
                            receipt || "N/A"
                        )}
                    </span>

                </div>


                <div class="student-box">


                    <div class="row">

                        <strong>
                            Student Name:
                        </strong>

                        <span>
                            ${escapeHTML(
                                studentName
                            )}
                        </span>

                    </div>


                    <div class="row">

                        <strong>
                            Father Name:
                        </strong>

                        <span>
                            ${escapeHTML(
                                fatherName
                            )}
                        </span>

                    </div>


                    <div class="row">

                        <strong>
                            Student ID:
                        </strong>

                        <span>
                            ${escapeHTML(
                                studentId || "N/A"
                            )}
                        </span>

                    </div>


                    <div class="row">

                        <strong>
                            Class:
                        </strong>

                        <span>
                            ${escapeHTML(
                                className || "N/A"
                            )}
                        </span>

                    </div>


                    ${
                        month
                        ?
                        `
                        <div class="row">

                            <strong>
                                Fee Month:
                            </strong>

                            <span>
                                ${escapeHTML(
                                    month
                                )}
                            </span>

                        </div>
                        `
                        :
                        ""
                    }


                </div>


                <div class="row">

                    <strong>
                        Payment Method:
                    </strong>

                    <span>
                        ${escapeHTML(
                            method
                        )}
                    </span>

                </div>


                <div class="row">

                    <strong>
                        Payment Date:
                    </strong>

                    <span>
                        ${escapeHTML(
                            formatDate(date)
                        )}
                    </span>

                </div>


                <div class="amount-box">

                    <div class="amount-label">

                        AMOUNT PAID

                    </div>


                    <div class="amount">

                        Rs.
                        ${formatNumber(
                            amount
                        )}

                    </div>

                </div>


                <div class="thankyou">

                    Thank you for your payment.

                    <br><br>

                    5 STAR SCHOOL

                </div>


                <div class="signature">

                    <div>
                        Parent Signature
                    </div>

                    <div>
                        School Incharge
                    </div>

                </div>


            </div>

        </body>

        </html>
    `);


    printWindow.document.close();


    printWindow.onload =
        function () {

            printWindow.focus();

            printWindow.print();
        };
}


/* =========================================================
   REFRESH ALL
   ========================================================= */

async function refreshAll() {

    try {

        await loadClasses();

        await loadStudents();

        await loadFees();

        await loadPayments();

        await loadDashboard();

        updateReport();

        showMessage(
            "Data refreshed successfully."
        );

    } catch (error) {

        console.error(
            "Refresh error:",
            error
        );

        showMessage(
            "Data refresh mein problem hui.",
            "error"
        );
    }
}


/* =========================================================
   DEBUG
   ========================================================= */

window.getStudents =
    function () {
        return students;
    };


window.getClasses =
    function () {
        return classes;
    };


window.getFees =
    function () {
        return fees;
    };


window.getPayments =
    function () {
        return payments;
    };


/* =========================================================
   EXPORT FUNCTIONS
   ========================================================= */

window.showPage =
    showPage;

window.logout =
    logout;

window.toggleSidebar =
    toggleSidebar;

window.toggleTheme =
    toggleTheme;

window.generateFees =
    generateFees;

window.printReport =
    printReport;

window.printReceipt =
    printReceipt;

window.filterStudents =
    filterStudents;

window.refreshAll =
    refreshAll;

window.loadStudents =
    loadStudents;

window.loadFees =
    loadFees;

window.loadPayments =
    loadPayments;

window.loadDashboard =
    loadDashboard;

window.selectFeeForPayment =
    selectFeeForPayment;


/* =========================================================
   START MESSAGE
   ========================================================= */

console.log(
    "%c5 STAR SCHOOL app.js loaded successfully.",
    "font-size:16px;font-weight:bold;"
);