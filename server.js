require("dotenv").config();

const express = require("express");
const path = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


/* =========================================================
   POSTGRESQL
   ========================================================= */

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});


/* =========================================================
   AUTHENTICATION
   ========================================================= */

function auth(req, res, next) {

    const header =
        req.headers.authorization;

    if (
        !header ||
        !header.startsWith("Bearer ")
    ) {

        return res.status(401).json({
            error: "Authentication required"
        });

    }

    try {

        const token =
            header.split(" ")[1];

        req.user =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );

        next();

    } catch (error) {

        return res.status(401).json({
            error: "Invalid or expired session"
        });

    }

}


/* =========================================================
   DEFAULT ADMIN
   ========================================================= */

async function createDefaultAdmin() {

    const result =
        await pool.query(
            `SELECT id
             FROM users
             WHERE username = $1`,
            ["5star"]
        );


    if (result.rows.length === 0) {

        const hash =
            await bcrypt.hash(
                "5starschool",
                12
            );


        await pool.query(
            `INSERT INTO users
            (
                username,
                password_hash,
                role
            )
            VALUES
            ($1,$2,$3)`,
            [
                "5star",
                hash,
                "admin"
            ]
        );


        console.log("");
        console.log(
            "Default admin created:"
        );
        console.log(
            "Username: 5star"
        );
        console.log(
            "Password: 5starschool"
        );
        console.log("");

    }

}


/* =========================================================
   LOGIN
   ========================================================= */

app.post(
    "/api/login",
    async (req, res) => {

        try {

            const {
                username,
                password
            } = req.body;


            if (
                !username ||
                !password
            ) {

                return res.status(400).json({
                    error:
                        "Username and password required"
                });

            }


            const result =
                await pool.query(
                    `SELECT *
                     FROM users
                     WHERE username = $1`,
                    [username]
                );


            if (
                result.rows.length === 0
            ) {

                return res.status(401).json({
                    error:
                        "Invalid username or password"
                });

            }


            const user =
                result.rows[0];


            const valid =
                await bcrypt.compare(
                    password,
                    user.password_hash
                );


            if (!valid) {

                return res.status(401).json({
                    error:
                        "Invalid username or password"
                });

            }


            const token =
                jwt.sign(
                    {
                        id: user.id,
                        username:
                            user.username,
                        role:
                            user.role
                    },
                    process.env.JWT_SECRET,
                    {
                        expiresIn: "8h"
                    }
                );


            res.json({

                token,

                user: {

                    id: user.id,

                    username:
                        user.username,

                    role:
                        user.role

                }

            });


        } catch (error) {

            console.error(
                "LOGIN ERROR:",
                error
            );


            res.status(500).json({
                error:
                    "Login failed"
            });

        }

    }
);


/* =========================================================
   DASHBOARD
   ========================================================= */

app.get(
    "/api/dashboard",
    auth,
    async (req, res) => {

        try {

            const students =
                await pool.query(
                    `SELECT
                        COUNT(*)::int AS count
                     FROM students
                     WHERE LOWER(
                        COALESCE(status,'active')
                     ) = 'active'`
                );


            const collection =
                await pool.query(
                    `SELECT
                        COALESCE(
                            SUM(amount),
                            0
                        ) AS total
                     FROM payments
                     WHERE DATE_TRUNC(
                        'month',
                        payment_date
                     )
                     =
                     DATE_TRUNC(
                        'month',
                        CURRENT_DATE
                     )`
                );


            const pending =
                await pool.query(
                    `SELECT
                        COALESCE(
                            SUM(remaining),
                            0
                        ) AS total
                     FROM fee_records
                     WHERE remaining > 0`
                );


            const today =
                await pool.query(
                    `SELECT
                        COALESCE(
                            SUM(amount),
                            0
                        ) AS total
                     FROM payments
                     WHERE payment_date::date
                     =
                     CURRENT_DATE`
                );


            res.json({

                students:
                    students.rows[0].count,

                totalStudents:
                    students.rows[0].count,

                monthlyCollection:
                    Number(
                        collection.rows[0].total
                    ),

                pending:
                    Number(
                        pending.rows[0].total
                    ),

                pendingFees:
                    Number(
                        pending.rows[0].total
                    ),

                todayCollection:
                    Number(
                        today.rows[0].total
                    )

            });


        } catch (error) {

            console.error(
                "DASHBOARD ERROR:",
                error
            );


            res.status(500).json({
                error:
                    "Dashboard error"
            });

        }

    }
);


/* =========================================================
   CLASSES
   ========================================================= */

app.get(
    "/api/classes",
    auth,
    async (req, res) => {

        try {

            const result =
                await pool.query(
                    `SELECT *
                     FROM classes
                     ORDER BY id`
                );


            res.json(
                result.rows
            );


        } catch (error) {

            console.error(
                "CLASSES ERROR:",
                error
            );


            res.status(500).json({
                error:
                    "Could not load classes"
            });

        }

    }
);


/* =========================================================
   GET STUDENTS
   ========================================================= */

app.get(
    "/api/students",
    auth,
    async (req, res) => {

        try {

            const result =
                await pool.query(
                    `
                    SELECT
                        s.*,

                        c.name
                        AS class_name

                    FROM students s

                    LEFT JOIN classes c

                    ON c.id = s.class_id

                    ORDER BY s.id DESC
                    `
                );


            res.json(
                result.rows
            );


        } catch (error) {

            console.error(
                "STUDENTS ERROR:",
                error
            );


            res.status(500).json({
                error:
                    "Could not load students"
            });

        }

    }
);


/* =========================================================
   ADD STUDENT
   ========================================================= */

app.post(
    "/api/students",
    auth,
    async (req, res) => {

        try {

            const {

                student_id,

                name,

                father_name,

                mother_name,

                class_id,

                section,

                roll_no,

                mobile,

                address,

                admission_date,

                monthly_fee,

                discount,

                previous_balance

            } = req.body;


            if (
                !student_id ||
                !name
            ) {

                return res.status(400).json({
                    error:
                        "Student ID and name are required"
                });

            }


            const result =
                await pool.query(
                    `
                    INSERT INTO students
                    (
                        student_id,
                        name,
                        father_name,
                        mother_name,
                        class_id,
                        section,
                        roll_no,
                        mobile,
                        address,
                        admission_date,
                        monthly_fee,
                        discount,
                        previous_balance
                    )

                    VALUES
                    (
                        $1,$2,$3,$4,$5,$6,$7,
                        $8,$9,$10,$11,$12,$13
                    )

                    RETURNING *
                    `,
                    [

                        student_id,

                        name,

                        father_name ||
                            null,

                        mother_name ||
                            null,

                        class_id
                            ? Number(class_id)
                            : null,

                        section ||
                            null,

                        roll_no ||
                            null,

                        mobile ||
                            null,

                        address ||
                            null,

                        admission_date ||
                            null,

                        Number(
                            monthly_fee || 0
                        ),

                        Number(
                            discount || 0
                        ),

                        Number(
                            previous_balance || 0
                        )

                    ]
                );


            try {

                await pool.query(
                    `
                    INSERT INTO audit_logs
                    (
                        user_id,
                        action,
                        details
                    )

                    VALUES
                    ($1,$2,$3)
                    `,
                    [
                        req.user.id,

                        "ADD_STUDENT",

                        `Student ${student_id} added`
                    ]
                );

            } catch (
                auditError
            ) {

                console.warn(
                    "Audit log failed:",
                    auditError.message
                );

            }


            res.status(201).json(
                result.rows[0]
            );


        } catch (error) {

            console.error(
                "ADD STUDENT ERROR:",
                error
            );


            if (
                error.code === "23505"
            ) {

                return res.status(409).json({
                    error:
                        "Student ID already exists"
                });

            }


            res.status(500).json({
                error:
                    "Could not add student"
            });

        }

    }
);


/* =========================================================
   GENERATE MONTHLY FEES
   =========================================================

   IMPORTANT:

   Agar body empty ho:

   {
   }

   to CURRENT MONTH ke tamam ACTIVE
   students ki fee generate hogi.

   Agar specific student bhejna ho:

   {
       "student_id": 5
   }

   ya:

   {
       "student_id": "ST-001"
   }

   dono supported hain.
   ========================================================= */

app.post(
    "/api/fees/generate",
    auth,
    async (req, res) => {

        const client =
            await pool.connect();


        try {

            await client.query(
                "BEGIN"
            );


            /* -----------------------------------------
               MONTH / YEAR
               ----------------------------------------- */

            const now =
                new Date();


            const month =
                Number(
                    req.body?.month ||
                    now.getMonth() + 1
                );


            const year =
                Number(
                    req.body?.year ||
                    now.getFullYear()
                );


            if (
                month < 1 ||
                month > 12
            ) {

                throw new Error(
                    "Invalid month"
                );

            }


            /* -----------------------------------------
               STUDENT ID OPTIONAL
               ----------------------------------------- */

            const requestedStudent =
                req.body?.student_id;


            let studentResult;


            /*
             * CASE 1:
             * Specific student requested
             */

            if (
                requestedStudent !==
                undefined &&
                requestedStudent !==
                null &&
                String(
                    requestedStudent
                ).trim() !== ""
            ) {

                const value =
                    String(
                        requestedStudent
                    ).trim();


                /*
                 * Internal PostgreSQL ID
                 */

                if (
                    /^\d+$/.test(value)
                ) {

                    studentResult =
                        await client.query(
                            `
                            SELECT *
                            FROM students

                            WHERE
                                id = $1

                                OR
                                student_id =
                                $2

                            FOR UPDATE
                            `,
                            [
                                Number(value),
                                value
                            ]
                        );

                } else {

                    /*
                     * Student's own
                     * student_id
                     */

                    studentResult =
                        await client.query(
                            `
                            SELECT *
                            FROM students

                            WHERE student_id = $1

                            FOR UPDATE
                            `,
                            [value]
                        );

                }


                if (
                    studentResult.rows.length ===
                    0
                ) {

                    throw new Error(
                        "Student not found"
                    );

                }

            }

            /*
             * CASE 2:
             * No student specified
             *
             * Generate for ALL ACTIVE students.
             */

            else {

                studentResult =
                    await client.query(
                        `
                        SELECT *

                        FROM students

                        WHERE LOWER(
                            COALESCE(
                                status,
                                'active'
                            )
                        ) = 'active'

                        ORDER BY id

                        FOR UPDATE
                        `
                    );


                if (
                    studentResult.rows.length ===
                    0
                ) {

                    throw new Error(
                        "No active students found"
                    );

                }

            }


            /* -----------------------------------------
               GENERATE FEE FOR EACH STUDENT
               ----------------------------------------- */

            const generated = [];

            const alreadyExists = [];


            for (
                const student
                of studentResult.rows
            ) {

                const monthlyFee =
                    Number(
                        student.monthly_fee ||
                        0
                    );


                const previousBalance =
                    Number(
                        student.previous_balance ||
                        0
                    );


                const discount =
                    Number(
                        student.discount ||
                        0
                    );


                const total =
                    monthlyFee +
                    previousBalance -
                    discount;


                /*
                 * Check whether this month's
                 * fee already exists.
                 */

                const existing =
                    await client.query(
                        `
                        SELECT *

                        FROM fee_records

                        WHERE
                            student_id = $1

                            AND
                            month = $2

                            AND
                            year = $3

                        LIMIT 1
                        `,
                        [
                            student.id,
                            month,
                            year
                        ]
                    );


                /*
                 * Existing fee:
                 * DON'T create duplicate.
                 */

                if (
                    existing.rows.length >
                    0
                ) {

                    alreadyExists.push(
                        existing.rows[0]
                    );

                    continue;

                }


                const invoiceNo =
                    `INV-${year}${String(
                        month
                    ).padStart(2, "0")}-${student.id}-${Date.now()}-${Math.floor(
                        Math.random() * 10000
                    )}`;


                const result =
                    await client.query(
                        `
                        INSERT INTO fee_records
                        (
                            invoice_no,
                            student_id,
                            month,
                            year,
                            monthly_fee,
                            previous_balance,
                            discount,
                            total,
                            paid,
                            remaining,
                            status
                        )

                        VALUES
                        (
                            $1,
                            $2,
                            $3,
                            $4,
                            $5,
                            $6,
                            $7,
                            $8,
                            0,
                            $8,
                            'PENDING'
                        )

                        RETURNING *
                        `,
                        [

                            invoiceNo,

                            student.id,

                            month,

                            year,

                            monthlyFee,

                            previousBalance,

                            discount,

                            total

                        ]
                    );


                generated.push(
                    result.rows[0]
                );

            }


            await client.query(
                "COMMIT"
            );


            /*
             * Audit log
             */

            try {

                await pool.query(
                    `
                    INSERT INTO audit_logs
                    (
                        user_id,
                        action,
                        details
                    )

                    VALUES
                    ($1,$2,$3)
                    `,
                    [

                        req.user.id,

                        "GENERATE_FEES",

                        `Generated ${generated.length} fee record(s) for ${month}/${year}`

                    ]
                );

            } catch (
                auditError
            ) {

                console.warn(
                    "Audit log failed:",
                    auditError.message
                );

            }


            res.status(201).json({

                success: true,

                message:
                    generated.length > 0
                        ? `${generated.length} fee record(s) generated successfully.`
                        : "All selected students already have fees for this month.",

                month,

                year,

                generatedCount:
                    generated.length,

                existingCount:
                    alreadyExists.length,

                generated,

                existing:
                    alreadyExists

            });


        } catch (error) {

            try {

                await client.query(
                    "ROLLBACK"
                );

            } catch {}

            console.error(
                "GENERATE FEE ERROR:",
                error
            );


            res.status(400).json({
                error:
                    error.message ||
                    "Could not generate fees"
            });


        } finally {

            client.release();

        }

    }
);


/* =========================================================
   GET FEE RECORDS
   ========================================================= */

app.get(
    "/api/fees",
    auth,
    async (req, res) => {

        try {

            const result =
                await pool.query(
                    `
                    SELECT

                        f.*,

                        s.student_id
                        AS student_code,

                        s.name
                        AS student_name,

                        s.father_name,

                        c.name
                        AS class_name

                    FROM fee_records f

                    JOIN students s

                    ON s.id =
                       f.student_id

                    LEFT JOIN classes c

                    ON c.id =
                       s.class_id

                    ORDER BY
                        f.year DESC,
                        f.month DESC,
                        f.id DESC
                    `
                );


            res.json(
                result.rows
            );


        } catch (error) {

            console.error(
                "FEES ERROR:",
                error
            );


            res.status(500).json({
                error:
                    "Could not load fee records"
            });

        }

    }
);


/* =========================================================
   COLLECT PAYMENT
   ========================================================= */

app.post(
    "/api/payments",
    auth,
    async (req, res) => {

        const client =
            await pool.connect();


        try {

            /*
             * Frontend ke multiple names
             * support kar rahe hain.
             */

            const feeRecordId =
                req.body?.fee_record_id ??
                req.body?.fee_id ??
                req.body?.feeRecordId;


            const paymentAmount =
                Number(
                    req.body?.amount ??
                    req.body?.payment_amount ??
                    0
                );


            const paymentMethod =
                req.body?.payment_method ??
                req.body?.method ??
                "Cash";


            if (
                !feeRecordId
            ) {

                return res.status(400).json({
                    error:
                        "Fee Record ID required"
                });

            }


            if (
                !paymentAmount ||
                paymentAmount <= 0
            ) {

                return res.status(400).json({
                    error:
                        "Invalid payment amount"
                });

            }


            await client.query(
                "BEGIN"
            );


            const feeResult =
                await client.query(
                    `
                    SELECT *

                    FROM fee_records

                    WHERE id = $1

                    FOR UPDATE
                    `,
                    [
                        Number(
                            feeRecordId
                        )
                    ]
                );


            if (
                feeResult.rows.length ===
                0
            ) {

                throw new Error(
                    "Fee record not found"
                );

            }


            const fee =
                feeResult.rows[0];


            const remaining =
                Number(
                    fee.remaining || 0
                );


            if (
                paymentAmount >
                remaining
            ) {

                throw new Error(
                    "Payment cannot be greater than remaining balance"
                );

            }


            const receiptNo =
                `REC-${new Date().getFullYear()}-${Date.now()}`;


            await client.query(
                `
                INSERT INTO payments
                (
                    receipt_no,
                    fee_record_id,
                    amount,
                    payment_method,
                    recorded_by
                )

                VALUES
                ($1,$2,$3,$4,$5)
                `,
                [

                    receiptNo,

                    Number(
                        feeRecordId
                    ),

                    paymentAmount,

                    paymentMethod,

                    req.user.id

                ]
            );


            const newPaid =
                Number(
                    fee.paid || 0
                ) +
                paymentAmount;


            const newRemaining =
                Math.max(
                    Number(
                        fee.total || 0
                    ) -
                    newPaid,
                    0
                );


            let status =
                "PARTIAL";


            if (
                newRemaining === 0
            ) {

                status =
                    "PAID";

            }


            await client.query(
                `
                UPDATE fee_records

                SET

                    paid = $1,

                    remaining = $2,

                    status = $3

                WHERE id = $4
                `,
                [

                    newPaid,

                    newRemaining,

                    status,

                    Number(
                        feeRecordId
                    )

                ]
            );


            try {

                await client.query(
                    `
                    INSERT INTO audit_logs
                    (
                        user_id,
                        action,
                        details
                    )

                    VALUES
                    ($1,$2,$3)
                    `,
                    [

                        req.user.id,

                        "COLLECT_FEE",

                        `Receipt ${receiptNo}, Amount ${paymentAmount}`

                    ]
                );

            } catch (
                auditError
            ) {

                console.warn(
                    "Audit log failed:",
                    auditError.message
                );

            }


            await client.query(
                "COMMIT"
            );


            res.status(201).json({

                success: true,

                receipt_no:
                    receiptNo,

                fee_record_id:
                    Number(
                        feeRecordId
                    ),

                amount:
                    paymentAmount,

                payment_method:
                    paymentMethod,

                paid:
                    newPaid,

                remaining:
                    newRemaining,

                status

            });


        } catch (error) {

            try {

                await client.query(
                    "ROLLBACK"
                );

            } catch {}


            console.error(
                "PAYMENT ERROR:",
                error
            );


            res.status(400).json({
                error:
                    error.message ||
                    "Payment failed"
            });


        } finally {

            client.release();

        }

    }
);


/* =========================================================
   PAYMENT HISTORY
   ========================================================= */

app.get(
    "/api/payments",
    auth,
    async (req, res) => {

        try {

            const result =
                await pool.query(
                    `
                    SELECT

                        p.*,

                        s.student_id
                        AS student_code,

                        s.name
                        AS student_name,

                        f.month,

                        f.year

                    FROM payments p

                    JOIN fee_records f

                    ON f.id =
                       p.fee_record_id

                    JOIN students s

                    ON s.id =
                       f.student_id

                    ORDER BY
                        p.payment_date DESC,
                        p.id DESC
                    `
                );


            res.json(
                result.rows
            );


        } catch (error) {

            console.error(
                "PAYMENTS ERROR:",
                error
            );


            res.status(500).json({
                error:
                    "Could not load payments"
            });

        }

    }
);


/* =========================================================
   HEALTH CHECK
   ========================================================= */

app.get(
    "/api/health",
    async (req, res) => {

        try {

            await pool.query(
                "SELECT 1"
            );


            res.json({

                status: "OK",

                database:
                    "Connected"

            });


        } catch (error) {

            console.error(
                error
            );


            res.status(500).json({

                status: "ERROR",

                database:
                    "Disconnected"

            });

        }

    }
);


/* =========================================================
   FRONTEND
   ========================================================= */

app.get(
    "*",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "index.html"
            )
        );

    }
);


/* =========================================================
   SERVER START
   ========================================================= */

const PORT = process.env.PORT || 5000;

if (require.main === module) {

    app.listen(PORT, async () => {

        console.log("");
        console.log("=========================================");
        console.log("       ⭐ 5 STAR SCHOOL");
        console.log("   Monthly Fee Billing System");
        console.log("=========================================");
        console.log(`Server: http://localhost:${PORT}`);
        console.log("");

        try {

            await pool.query("SELECT 1");

            console.log("PostgreSQL: CONNECTED");

            await createDefaultAdmin();

        } catch (error) {

            console.error(
                "PostgreSQL connection failed:",
                error.message
            );

        }

    });

}

module.exports = app;