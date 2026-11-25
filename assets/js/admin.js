
const API = "https://myfinance-api.pradhamaryando28.workers.dev";

let token = sessionStorage.getItem("mf_admin_token") || "";
let lastRows = [];

const $ = id => document.getElementById(id);

const fmt = n => new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
}).format(Number(n || 0));

async function call(path, opt = {}) {
    const r = await fetch(API + path, {
        ...opt,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: "Bearer " + token } : {}),
            ...(opt.headers || {})
        }
    });

    const d = await r.json().catch(() => ({
        success: false,
        message: "Respons server tidak valid"
    }));

    if (!r.ok || d.success === false) {
        throw Error(d.message || "Permintaan gagal");
    }

    return d;
}

// SIAPKAN PILIHAN DOMPET
function setupWalletOptions() {
    const select = $("adjustProfile");

    if (!select) return;

    select.innerHTML = `
        <option value="Keluarga">Saldo Keluarga</option>
        <option value="Suami">Saldo Suami</option>
        <option value="Istri">Saldo Istri</option>
    `;
}

// LOGIN ADMIN
$("loginForm").onsubmit = async e => {
    e.preventDefault();
    $("loginError").textContent = "";

    try {
        const d = await call("/api/admin/login", {
            method: "POST",
            body: JSON.stringify({
                pin: $("pin").value
            })
        });

        token = d.token;
        sessionStorage.setItem("mf_admin_token", token);

        showAdmin();
    } catch (err) {
        $("loginError").textContent = err.message;
    }
};

// TAMPILKAN ADMIN
function showAdmin() {
    $("login").hidden = true;
    $("dashboard").hidden = false;

    setupWalletOptions();

    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);

    if ($("dateFrom")) {
        $("dateFrom").value = first.toLocaleDateString("en-CA");
    }

    if ($("dateTo")) {
        $("dateTo").value = now.toLocaleDateString("en-CA");
    }

    if ($("adjustDate")) {
        $("adjustDate").value = now.toLocaleDateString("en-CA");
    }

    loadOverview();
}

// TAMPILKAN KARTU SALDO
function renderWallets(wallets) {
    const overview = $("overview");

    if (!overview) return;

    let panel = $("walletCards");

    if (!panel) {
        panel = document.createElement("div");
        panel.id = "walletCards";

        const heading = overview.querySelector("h2");

        if (heading) {
            heading.insertAdjacentElement("afterend", panel);
        } else {
            overview.prepend(panel);
        }
    }

    panel.innerHTML = `
        <div style="
            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(190px,1fr));
            gap:12px;
            margin:18px 0;
        ">
            <div style="
                background:#eff6ff;
                border:1px solid #bfdbfe;
                border-radius:14px;
                padding:18px;
            ">
                <small style="color:#1d4ed8;font-weight:600">
                    SALDO KELUARGA
                </small>
                <h2 style="color:#1e40af;margin:10px 0 0">
                    ${fmt(wallets.keluarga)}
                </h2>
            </div>

            <div style="
                background:#ecfdf5;
                border:1px solid #a7f3d0;
                border-radius:14px;
                padding:18px;
            ">
                <small style="color:#047857;font-weight:600">
                    SALDO SUAMI
                </small>
                <h2 style="color:#047857;margin:10px 0 0">
                    ${fmt(wallets.suami)}
                </h2>
            </div>

            <div style="
                background:#fff7ed;
                border:1px solid #fed7aa;
                border-radius:14px;
                padding:18px;
            ">
                <small style="color:#c2410c;font-weight:600">
                    SALDO ISTRI
                </small>
                <h2 style="color:#c2410c;margin:10px 0 0">
                    ${fmt(wallets.istri)}
                </h2>
            </div>
        </div>

        <div style="
            padding:16px;
            border-radius:12px;
            background:#f8fafc;
            border:1px solid #e2e8f0;
            margin-bottom:18px;
        ">
            <small style="color:#64748b;font-weight:600">
                TOTAL SELURUH SALDO
            </small>
            <h2 style="margin:6px 0 0;color:#0f172a">
                ${fmt(wallets.total)}
            </h2>
        </div>
    `;
}

// RINGKASAN
async function loadOverview() {
    try {
        const [s, a] = await Promise.all([
            call("/api/summary"),
            call("/api/admin/adjustments")
        ]);

        const wallets = s.data.wallets || {
            keluarga: 0,
            suami: 0,
            istri: 0,
            total: Number(s.data.balance || 0)
        };

        renderWallets(wallets);

        $("totalBalance").textContent = fmt(wallets.total);
        $("totalIncome").textContent = fmt(s.data.income);
        $("totalExpense").textContent = fmt(s.data.expense);

        $("adjustments").innerHTML = (a.data || [])
            .slice(0, 8)
            .map(x => `
                <div class="row">
                    <span>
                        ${esc(x.description)}
                        <small>
                            ${esc(x.adjustment_date)}
                            · ${esc(x.profile || "Keluarga")}
                            · ${x.type === "add" ? "Tambah saldo" : "Tarik saldo"}
                        </small>
                    </span>
                    <b>${x.type === "add" ? "+" : "−"}${fmt(x.amount)}</b>
                </div>
            `).join("") || "<p>Belum ada penyesuaian saldo.</p>";

    } catch (e) {
        $("globalError").textContent = e.message;

        if (e.message.includes("Sesi admin")) {
            logout();
        }
    }
}

// NAVIGASI TAB
document.querySelectorAll("nav [data-tab]").forEach(b => {
    b.onclick = () => {
        document.querySelectorAll("nav [data-tab]")
            .forEach(x => x.classList.toggle("active", x === b));

        document.querySelectorAll(".tab")
            .forEach(x => x.hidden = x.id !== b.dataset.tab);

        if (b.dataset.tab === "overview") {
            loadOverview();
        }

        if (b.dataset.tab === "report") {
            loadReport();
        }
    };
});

// TANGGAL DEFAULT
if ($("adjustDate")) {
    $("adjustDate").value = new Date().toLocaleDateString("en-CA");
}

// TAMBAH / TARIK SALDO
$("adjustForm").onsubmit = async e => {
    e.preventDefault();

    $("adjustMsg").textContent = "";

    const profile = $("adjustProfile").value;
    const type = $("adjustType").value;
    const amount = Number($("adjustAmount").value);

    if (!["Keluarga", "Suami", "Istri"].includes(profile)) {
        $("adjustMsg").textContent = "Dompet tidak valid.";
        return;
    }

    if (!["add", "withdraw"].includes(type) ||
        !Number.isSafeInteger(amount) || amount <= 0) {
        $("adjustMsg").textContent = "Jenis atau nominal tidak valid.";
        return;
    }

    try {
        const d = await call("/api/admin/adjustments", {
            method: "POST",
            body: JSON.stringify({
                type,
                profile,
                amount,
                description: $("adjustDesc").value,
                adjustment_date: $("adjustDate").value
            })
        });

        $("adjustMsg").textContent = d.message ||
            `Penyesuaian saldo ${profile} berhasil disimpan.`;

        const selectedProfile = profile;

        $("adjustForm").reset();

        $("adjustProfile").value = selectedProfile;
        $("adjustType").value = "add";
        $("adjustDate").value = new Date().toLocaleDateString("en-CA");

        $("adjustAmount").value = "";
        $("adjustDesc").value = "";

        await loadOverview();

    } catch (err) {
        $("adjustMsg").textContent = err.message;
    }
};

// LAPORAN
$("runReport").onclick = loadReport;

async function loadReport() {
    try {
        const from = $("dateFrom").value;
        const to = $("dateTo").value;

        if (!from || !to || from > to) {
            throw Error("Periksa tanggal laporan.");
        }

        const d = await call(
            `/api/admin/transactions?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
        );

        lastRows = d.data || [];

        const income = lastRows
            .filter(x => x.type === "income")
            .reduce((s, x) => s + Number(x.amount), 0);

        const expense = lastRows
            .filter(x => x.type === "expense")
            .reduce((s, x) => s + Number(x.amount), 0);

        const expenseSuami = lastRows
            .filter(x => x.type === "expense" && x.profile === "Suami")
            .reduce((s, x) => s + Number(x.amount), 0);

        const expenseIstri = lastRows
            .filter(x => x.type === "expense" && x.profile === "Istri")
            .reduce((s, x) => s + Number(x.amount), 0);

        $("reportTotals").innerHTML = `
            <div style="
                display:grid;
                grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
                gap:10px;
                margin:15px 0;
            ">
                <div class="card">
                    <small>Pemasukan</small>
                    <h3>${fmt(income)}</h3>
                </div>
                <div class="card">
                    <small>Pengeluaran</small>
                    <h3>${fmt(expense)}</h3>
                </div>
                <div class="card">
                    <small>Pengeluaran Suami</small>
                    <h3>${fmt(expenseSuami)}</h3>
                </div>
                <div class="card">
                    <small>Pengeluaran Istri</small>
                    <h3>${fmt(expenseIstri)}</h3>
                </div>
                <div class="card">
                    <small>Selisih</small>
                    <h3>${fmt(income - expense)}</h3>
                </div>
            </div>
        `;

        $("reportRows").innerHTML = `
            <div style="overflow-x:auto">
                <table class="reporttable">
                    <thead>
                        <tr>
                            <th>Tanggal</th>
                            <th>Profil</th>
                            <th>Keterangan</th>
                            <th>Jenis</th>
                            <th>Nominal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${lastRows.map(x => `
                            <tr>
                                <td>${esc(x.transaction_date)}</td>
                                <td>${esc(x.profile || "-")}</td>
                                <td>${esc(x.description)}</td>
                                <td>
                                    ${x.type === "income" ? "Pemasukan" : "Pengeluaran"}
                                </td>
                                <td>${fmt(x.amount)}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        `;

    } catch (e) {
        $("reportRows").textContent = e.message;
    }
}

// EKSPOR CSV
$("csv").onclick = () => {
    if (!lastRows.length) {
        alert("Belum ada data laporan.");
        return;
    }

    const rows = [
        ["Tanggal", "Profil", "Keterangan", "Jenis", "Kategori", "Nominal"],
        ...lastRows.map(x => [
            x.transaction_date,
            x.profile,
            x.description,
            x.type,
            x.category_name,
            x.amount
        ])
    ];

    const csv = rows.map(r =>
        r.map(v => '"' + String(v ?? "").replace(/"/g, '""') + '"')
            .join(",")
    ).join("\r\n");

    const blob = new Blob(["\ufeff" + csv], {
        type: "text/csv;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "laporan-myfinance.csv";
    a.click();

    URL.revokeObjectURL(url);
};

// LOGOUT
$("logout").onclick = logout;

async function logout() {
    try {
        await call("/api/admin/logout", {
            method: "POST"
        });
    } catch {}

    token = "";

    sessionStorage.removeItem("mf_admin_token");

    $("dashboard").hidden = true;
    $("login").hidden = false;
}

// ESCAPE HTML
function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[c]));
}

// CEK SESI
setupWalletOptions();

if (token) {
    showAdmin();
}
