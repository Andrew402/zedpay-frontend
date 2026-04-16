import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import './App.css'

const API_BASE_URL = 'http://localhost:7070'

// ── Icon helpers (inline SVG) ────────────────────────────
const Icon = ({ d, size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
    </svg>
)

const NAV_ITEMS = [
    { page: 'dashboard',     label: 'Dashboard',        icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
    { page: 'profile',       label: 'My Profile',       icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z' },
    { page: 'create-wallet', label: 'Create Wallet',    icon: 'M12 5v14M5 12h14' },
    { page: 'my-accounts',   label: 'My Accounts',      icon: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z' },
    { page: 'topup',         label: 'Add Balance',      icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
    { page: 'withdraw',      label: 'Withdraw',         icon: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3.332.804-4.5 2.05C10.832 3.964 9.26 3.158 7.5 3A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z' },
    { page: 'send-money',    label: 'Send Money',       icon: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z' },
    { page: 'transactions',  label: 'My Transactions',  icon: 'M9 17H5a2 2 0 0 0-2 2v1h18v-1a2 2 0 0 0-2-2h-4m-4 0V7m0 10H9m4-10a3 3 0 1 1-6 0 3 3 0 0 1 6 0z' },
    { page: 'statement',     label: 'Statement',        icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8' },
]

const QUICK_LINKS = [
    { page: 'profile',    icon: '👤', title: 'My Profile',   desc: 'View profile & select active account' },
    { page: 'my-accounts',icon: '💼', title: 'My Accounts',  desc: 'View your linked wallets' },
    { page: 'send-money', icon: '💸', title: 'Send Money',   desc: 'Transfer funds instantly' },
    { page: 'statement',  icon: '📄', title: 'Statement',    desc: 'Load account history' },
]

// ── Transaction helpers ──────────────────────────────────
const TX_TYPE_META = {
    TOPUP:       { label: 'Top Up',      color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: '↓' },
    WITHDRAW:    { label: 'Withdrawal',  color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: '↑' },
    SEND_MONEY:  { label: 'Send Money',  color: '#2f6cef', bg: '#eef3fe', border: '#bfdbfe', icon: '→' },
    RECEIVE:     { label: 'Received',    color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: '↓' },
    CREDIT:      { label: 'Credit',      color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: '↓' },
    DEBIT:       { label: 'Debit',       color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: '↑' },
}

const parseTx = (item) => {
    if (typeof item === 'string') {
        try { return JSON.parse(item) } catch { return { _raw: item } }
    }
    return item || {}
}

const formatTimestamp = (ts) => {
    if (!ts) return '—'
    try {
        const d = new Date(ts)
        return d.toLocaleString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        })
    } catch { return ts }
}

const shortId = (id) => id ? `…${id.slice(-8)}` : '—'

const TxCard = ({ item, keyPrefix }) => {
    const tx = parseTx(item)

    // If we can't parse it at all, show minimal fallback
    if (tx._raw) return (
        <div className="tx-card tx-card-fallback">
            <span className="tx-card-raw">{tx._raw}</span>
        </div>
    )

    const typeKey = tx.direction === 'CREDIT' ? 'CREDIT'
        : tx.direction === 'DEBIT'  ? 'DEBIT'
            : tx.type || 'TOPUP'

    const meta = TX_TYPE_META[typeKey] || TX_TYPE_META['TOPUP']
    const txId = tx.transactionId || tx.id || keyPrefix

    return (
        <div className="tx-card" style={{ '--tx-color': meta.color, '--tx-bg': meta.bg, '--tx-border': meta.border }}>
            <div className="tx-card-header">
                <div className="tx-type-badge" style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
                    <span className="tx-type-icon">{meta.icon}</span>
                    {meta.label}
                </div>
                <span className={`tx-status-pill ${tx.status === 'SUCCESS' ? 'success' : 'pending'}`}>
                    {tx.status || 'UNKNOWN'}
                </span>
            </div>

            <div className="tx-amount-row">
                <span className="tx-amount" style={{ color: meta.color }}>
                    {(typeKey === 'DEBIT' || typeKey === 'WITHDRAW') ? '−' : '+'}ZMW {Number(tx.amount || 0).toFixed(2)}
                </span>
                <span className="tx-time">{formatTimestamp(tx.timestamp)}</span>
            </div>

            <div className="tx-details-grid">
                <div className="tx-detail">
                    <span>Transaction ID</span>
                    <strong title={tx.transactionId}>{shortId(tx.transactionId)}</strong>
                </div>
                {tx.accountId && (
                    <div className="tx-detail">
                        <span>Account</span>
                        <strong title={tx.accountId}>{shortId(tx.accountId)}</strong>
                    </div>
                )}
                {tx.fromAccountId && (
                    <div className="tx-detail">
                        <span>From</span>
                        <strong title={tx.fromAccountId}>{shortId(tx.fromAccountId)}</strong>
                    </div>
                )}
                {tx.toAccountId && (
                    <div className="tx-detail">
                        <span>To</span>
                        <strong title={tx.toAccountId}>{shortId(tx.toAccountId)}</strong>
                    </div>
                )}
                {(tx.totalFee !== undefined && tx.totalFee !== null) && (
                    <div className="tx-detail">
                        <span>Fee</span>
                        <strong>ZMW {Number(tx.totalFee).toFixed(2)}</strong>
                    </div>
                )}
                {tx.type && tx.direction && (
                    <div className="tx-detail">
                        <span>Direction</span>
                        <strong>{tx.direction}</strong>
                    </div>
                )}
            </div>
        </div>
    )
}

const StatementCard = ({ text }) => {
    if (!text) return null
    // Parse lines like "Standard Account Statement — Balance: 179.75"
    // or any key: value lines
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    const balanceMatch = text.match(/[Bb]alance[:\s]+([0-9.,]+)/)
    const typeMatch    = text.match(/^([A-Za-z ]+(?:Account Statement|Statement))/i)
    const otherLines   = lines.filter(l =>
        !l.match(/[Bb]alance[:\s]+[0-9.,]+/) &&
        !l.match(/^([A-Za-z ]+(?:Account Statement|Statement))/i) &&
        l !== '—' && l !== '-'
    )

    return (
        <div className="statement-card">
            <div className="statement-card-top">
                <div className="statement-card-icon">📋</div>
                <div>
                    <div className="statement-card-title">
                        {typeMatch ? typeMatch[1].trim() : 'Account Statement'}
                    </div>
                    <div className="statement-card-sub">Official account record</div>
                </div>
            </div>
            {balanceMatch && (
                <div className="statement-balance-block">
                    <span>Current Balance</span>
                    <strong>ZMW {Number(balanceMatch[1]).toFixed(2)}</strong>
                </div>
            )}
            {otherLines.length > 0 && (
                <div className="statement-extra-lines">
                    {otherLines.map((l, i) => <p key={i}>{l}</p>)}
                </div>
            )}
        </div>
    )
}

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [currentPage, setCurrentPage] = useState('dashboard')
    const [authMode, setAuthMode] = useState('login')
    const [loggedInUser, setLoggedInUser] = useState(null)

    const [loginForm, setLoginForm] = useState({ email: '', password: '' })

    const [registerForm, setRegisterForm] = useState({
        fullName: '', phoneNumber: '', nationalId: '', email: '', password: '',
    })

    const [accountForm, setAccountForm] = useState({
        userId: '', accountType: 'STANDARD', minimumBalance: '', businessRegistrationId: '',
    })

    const [topUpForm, setTopUpForm] = useState({ accountId: '', amount: '' })
    const [withdrawForm, setWithdrawForm] = useState({ accountId: '', amount: '' })
    const [sendMoneyForm, setSendMoneyForm] = useState({
        fromAccountId: '', toAccountId: '', amount: '', merchantPayment: false,
    })

    const [lookupAccountId, setLookupAccountId] = useState('')
    const [statement, setStatement] = useState('')
    const [history, setHistory] = useState([])
    const [myAccounts, setMyAccounts] = useState([])
    const [recentRecipients, setRecentRecipients] = useState([])
    const [profileUser, setProfileUser] = useState(null)
    const [profileAccounts, setProfileAccounts] = useState([])
    const [activeAccountId, setActiveAccountId] = useState('')
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [walletSummary, setWalletSummary] = useState({ totalBalance: '0.00', accountCount: 0 })

    const activeAccount = useMemo(
        () => profileAccounts.find((a) => a.id === activeAccountId) || null,
        [profileAccounts, activeAccountId]
    )

    useEffect(() => {
        const savedUser = localStorage.getItem('zedpay_logged_in_user')
        const savedPage = localStorage.getItem('zedpay_current_page')
        const savedActiveAccountId = localStorage.getItem('zedpay_active_account_id')
        if (savedUser) {
            const parsedUser = JSON.parse(savedUser)
            setLoggedInUser(parsedUser)
            setProfileUser(parsedUser)
            setAccountForm((prev) => ({ ...prev, userId: parsedUser.id }))
            setIsLoggedIn(true)
        }
        if (savedPage) setCurrentPage(savedPage)
        if (savedActiveAccountId) setActiveAccountId(savedActiveAccountId)
    }, [])

    useEffect(() => { localStorage.setItem('zedpay_current_page', currentPage) }, [currentPage])

    useEffect(() => {
        if (activeAccountId) localStorage.setItem('zedpay_active_account_id', activeAccountId)
        else localStorage.removeItem('zedpay_active_account_id')
    }, [activeAccountId])

    const clearAlerts = () => { setMessage(''); setError('') }
    const showSuccess = (t) => { setMessage(t); setError('') }
    const showError   = (t) => { setError(t);   setMessage('') }

    const mkChange = (setter) => (e) => {
        const { name, value, type, checked } = e.target
        setter((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    }

    const calculateWalletSummary = (accounts) => {
        const total = accounts.reduce((s, a) => s + Number(a.balance || 0), 0)
        setWalletSummary({ totalBalance: total.toFixed(2), accountCount: accounts.length })
    }

    const applyActiveAccountEverywhere = (accountId) => {
        if (!accountId) return
        setTopUpForm((prev) => ({ ...prev, accountId }))
        setWithdrawForm((prev) => ({ ...prev, accountId }))
        setSendMoneyForm((prev) => ({ ...prev, fromAccountId: accountId }))
        setLookupAccountId(accountId)
    }

    const syncUserData = async (userId, silent = true) => {
        if (!userId?.trim()) return null
        try {
            const [userRes, accountsRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/users/${userId}`),
                axios.get(`${API_BASE_URL}/users/${userId}/accounts`),
            ])
            const freshUser = userRes.data
            const freshAccounts = accountsRes.data || []
            const userWithAccounts = { ...freshUser, accounts: freshAccounts }

            setLoggedInUser(userWithAccounts)
            setProfileUser(freshUser)
            setProfileAccounts(freshAccounts)
            setMyAccounts(freshAccounts)
            setAccountForm((prev) => ({ ...prev, userId }))

            let accountToUse = ''
            if (freshAccounts.length > 0) {
                const stillExists = freshAccounts.some((a) => a.id === activeAccountId)
                accountToUse = stillExists ? activeAccountId : freshAccounts[0].id
                if (!stillExists) setActiveAccountId(accountToUse)
                applyActiveAccountEverywhere(accountToUse)
            } else {
                setActiveAccountId('')
                setTopUpForm((prev) => ({ ...prev, accountId: '' }))
                setWithdrawForm((prev) => ({ ...prev, accountId: '' }))
                setSendMoneyForm((prev) => ({ ...prev, fromAccountId: '' }))
                setLookupAccountId('')
            }

            calculateWalletSummary(freshAccounts)
            localStorage.setItem('zedpay_logged_in_user', JSON.stringify(userWithAccounts))
            return { user: freshUser, accounts: freshAccounts }
        } catch (err) {
            if (!silent) showError(err.response?.data?.message || 'Failed to refresh user data')
            return null
        }
    }

    const handleLogin = async (e) => {
        e.preventDefault(); clearAlerts(); setLoading(true)
        try {
            const res = await axios.post(`${API_BASE_URL}/auth/login`, loginForm)
            setIsLoggedIn(true)
            setCurrentPage('dashboard')
            await syncUserData(res.data.user.id, true)
            localStorage.setItem('zedpay_current_page', 'dashboard')
            showSuccess('Login successful')
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to login')
        } finally { setLoading(false) }
    }

    const handleAuthRegister = async (e) => {
        e.preventDefault(); clearAlerts(); setLoading(true)
        try {
            await axios.post(`${API_BASE_URL}/users/register`, registerForm)
            showSuccess('Account created successfully. You can now log in.')
            setRegisterForm({ fullName: '', phoneNumber: '', nationalId: '', email: '', password: '' })
            setAuthMode('login')
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to create account')
        } finally { setLoading(false) }
    }

    const handleLogout = () => {
        setIsLoggedIn(false); setCurrentPage('dashboard'); setAuthMode('login')
        setLoggedInUser(null); setProfileUser(null); setProfileAccounts([])
        setActiveAccountId(''); setLoginForm({ email: '', password: '' })
        setMyAccounts([]); setHistory([]); setStatement('')
        setLookupAccountId(''); setRecentRecipients([])
        setWalletSummary({ totalBalance: '0.00', accountCount: 0 })
        setTopUpForm({ accountId: '', amount: '' })
        setWithdrawForm({ accountId: '', amount: '' })
        setSendMoneyForm({ fromAccountId: '', toAccountId: '', amount: '', merchantPayment: false })
        localStorage.removeItem('zedpay_logged_in_user')
        localStorage.removeItem('zedpay_current_page')
        localStorage.removeItem('zedpay_active_account_id')
        clearAlerts()
    }

    const createAccount = async (e) => {
        e.preventDefault(); clearAlerts(); setLoading(true)
        const payload = {
            userId: accountForm.userId,
            accountType: accountForm.accountType,
            minimumBalance: accountForm.minimumBalance === '' ? 0 : Number(accountForm.minimumBalance),
        }
        if (accountForm.accountType === 'MERCHANT') payload.businessRegistrationId = accountForm.businessRegistrationId
        try {
            const res = await axios.post(`${API_BASE_URL}/accounts/create`, payload)
            const syncResult = await syncUserData(accountForm.userId, true)
            if (syncResult?.accounts?.length) {
                const newest = syncResult.accounts[syncResult.accounts.length - 1]
                if (newest?.id) { setActiveAccountId(newest.id); applyActiveAccountEverywhere(newest.id) }
            }
            showSuccess(`Account created successfully: ${res.data.accountNumber}`)
            setAccountForm((prev) => ({ ...prev, minimumBalance: '', businessRegistrationId: '' }))
            setCurrentPage('my-accounts')
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to create account')
        } finally { setLoading(false) }
    }

    const topUpAccount = async (e) => {
        e.preventDefault(); clearAlerts(); setLoading(true)
        try {
            await axios.post(`${API_BASE_URL}/transactions/topup`, {
                accountId: topUpForm.accountId, amount: Number(topUpForm.amount),
            })
            await syncUserData(loggedInUser?.id, true)
            showSuccess('Top up completed successfully')
            setTopUpForm((prev) => ({ ...prev, amount: '' }))
            setCurrentPage('dashboard')
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to top up account')
        } finally { setLoading(false) }
    }

    const withdrawFromAccount = async (e) => {
        e.preventDefault(); clearAlerts(); setLoading(true)
        try {
            await axios.post(`${API_BASE_URL}/transactions/withdraw`, {
                accountId: withdrawForm.accountId, amount: Number(withdrawForm.amount),
            })
            await syncUserData(loggedInUser?.id, true)
            showSuccess('Withdrawal completed successfully')
            setWithdrawForm((prev) => ({ ...prev, amount: '' }))
            setCurrentPage('dashboard')
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to withdraw')
        } finally { setLoading(false) }
    }

    const sendMoney = async (e) => {
        e.preventDefault(); clearAlerts(); setLoading(true)
        try {
            const res = await axios.post(`${API_BASE_URL}/transactions/send`, {
                fromAccountId: sendMoneyForm.fromAccountId,
                toAccountId: sendMoneyForm.toAccountId,
                amount: Number(sendMoneyForm.amount),
                merchantPayment: sendMoneyForm.merchantPayment,
            })
            await syncUserData(loggedInUser?.id, true)
            showSuccess('Money sent successfully')
            if (sendMoneyForm.toAccountId.trim()) {
                setRecentRecipients((prev) =>
                    [sendMoneyForm.toAccountId, ...prev.filter((id) => id !== sendMoneyForm.toAccountId)].slice(0, 5)
                )
            }
            if (res.data?.summary) setHistory((prev) => [res.data.summary, ...prev].slice(0, 10))
            setSendMoneyForm((prev) => ({ ...prev, toAccountId: '', amount: '', merchantPayment: false }))
            setCurrentPage('transactions')
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to send money')
        } finally { setLoading(false) }
    }

    const loadStatementAndHistory = async () => {
        clearAlerts()
        if (!lookupAccountId.trim()) { showError('Account ID is required'); return }
        setLoading(true)
        try {
            const [stmtRes, histRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/accounts/${lookupAccountId}/statement`),
                axios.get(`${API_BASE_URL}/accounts/${lookupAccountId}/history`),
            ])
            setStatement(stmtRes.data.statement || '')
            setHistory(histRes.data || [])
            showSuccess('Statement and history loaded successfully')
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to load account details')
        } finally { setLoading(false) }
    }

    useEffect(() => {
        if (isLoggedIn && loggedInUser?.id) syncUserData(loggedInUser.id, true)
    }, [isLoggedIn])

    const copyUserId = async () => {
        if (!profileUser?.id) { showError('No user ID available to copy'); return }
        try { await navigator.clipboard.writeText(profileUser.id); showSuccess('User ID copied') }
        catch { showError('Failed to copy user ID') }
    }

    const copyAccountId = async (accountId) => {
        if (!accountId) { showError('No account ID available to copy'); return }
        try { await navigator.clipboard.writeText(accountId); showSuccess('Account ID copied') }
        catch { showError('Failed to copy account ID') }
    }

    const handleActiveAccountChange = (accountId) => {
        setActiveAccountId(accountId)
        applyActiveAccountEverywhere(accountId)
        showSuccess('Active account updated')
    }

    // ── Page renderer ──────────────────────────────────────
    const renderPage = () => {
        if (currentPage === 'dashboard') return (
            <>
                <section className="home-hero">
                    <div className="home-hero-text">
                        <span className="hero-chip">ZedPay Wallet Platform</span>
                        <h2>Your money,<br />your wallets.</h2>
                        <p>Manage balances, send money, withdraw, and view your own account records in a secure end-user interface.</p>
                        <div className="hero-actions">
                            <button onClick={() => setCurrentPage('profile')}>My Profile</button>
                            <button className="secondary-btn" onClick={() => setCurrentPage('send-money')}>Send Money</button>
                        </div>
                    </div>
                    <div className="hero-phone-card">
                        <div className="phone-top">ZedPay Wallet</div>
                        <div className="phone-balance-label">Available Balance</div>
                        <div className="phone-balance">ZMW {walletSummary.totalBalance}</div>
                        <div className="phone-mini-grid">
                            <div><span>Wallets</span><strong>{walletSummary.accountCount}</strong></div>
                            <div><span>Recipients</span><strong>{recentRecipients.length}</strong></div>
                        </div>
                    </div>
                </section>

                <section className="stats-grid">
                    <div className="stat-card">
                        <span>Total Balance</span>
                        <strong>ZMW {walletSummary.totalBalance}</strong>
                    </div>
                    <div className="stat-card">
                        <span>Linked Wallets</span>
                        <strong>{walletSummary.accountCount}</strong>
                    </div>
                    <div className="stat-card">
                        <span>Active Wallet</span>
                        <strong style={{ fontSize: '15px', letterSpacing: '0.03em' }}>
                            {activeAccount ? activeAccount.accountNumber : '— None selected'}
                        </strong>
                    </div>
                </section>

                <section className="quick-links-grid">
                    {QUICK_LINKS.map(({ page, icon, title, desc }) => (
                        <button key={page} className="quick-link-card" onClick={() => setCurrentPage(page)}>
                            <div className="quick-link-card-icon">{icon}</div>
                            <h3>{title}</h3>
                            <p>{desc}</p>
                        </button>
                    ))}
                </section>

                <section className="dashboard-bottom-grid">
                    <div className="content-card">
                        <div className="section-title-row">
                            <div>
                                <h3>My Wallets</h3>
                                <p>Your linked accounts at a glance</p>
                            </div>
                        </div>
                        {myAccounts.length === 0 ? (
                            <div className="empty-card">No wallet accounts available yet.</div>
                        ) : (
                            <div className="snapshot-list">
                                {myAccounts.map((account) => (
                                    <div key={account.id}
                                         className={`snapshot-item ${activeAccountId === account.id ? 'selected-snapshot-item' : ''}`}>
                                        <div>
                                            <strong>{account.accountNumber}</strong>
                                            <p>{account.id}</p>
                                        </div>
                                        {activeAccountId === account.id && (
                                            <span className="selector-active-pill">Active</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="content-card">
                        <div className="section-title-row">
                            <div>
                                <h3>Quick Actions</h3>
                                <p>Move money easily</p>
                            </div>
                        </div>
                        <div className="snapshot-list">
                            {[
                                ['topup',       'Add Balance'],
                                ['withdraw',     'Withdraw Funds'],
                                ['send-money',   'Transfer Funds'],
                                ['statement',    'View Statement'],
                            ].map(([page, label]) => (
                                <button key={page} className="quick-action-btn" onClick={() => setCurrentPage(page)}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>
            </>
        )

        if (currentPage === 'profile') return (
            <section className="single-page-card">
                <div className="page-header">
                    <h2>My Profile</h2>
                    <p>View your profile, registered accounts, and choose your active account.</p>
                </div>
                {!profileUser ? (
                    <div className="empty-card">No profile loaded yet.</div>
                ) : (
                    <div className="profile-layout">
                        <div className="profile-card">
                            <div className="profile-top">
                                <div className="profile-avatar">
                                    {profileUser.fullName?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div>
                                    <h3>{profileUser.fullName}</h3>
                                    <p>Wallet Member</p>
                                </div>
                            </div>
                            <div className="profile-user-id-bar">
                                <div>
                                    <span>User ID</span>
                                    <strong>{profileUser.id}</strong>
                                </div>
                                <button type="button" className="copy-btn" onClick={copyUserId}>Copy</button>
                            </div>
                            <div className="profile-details-grid">
                                {[
                                    ['Phone', profileUser.phoneNumber],
                                    ['National ID', profileUser.nationalId],
                                    ['Email', profileUser.email],
                                    ['Total Accounts', profileAccounts.length],
                                ].map(([label, val]) => (
                                    <div key={label} className="profile-detail-box">
                                        <span>{label}</span>
                                        <strong>{val}</strong>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="profile-accounts-section">
                            <div className="section-title-row">
                                <div>
                                    <h3>Registered Accounts</h3>
                                    <p>Click any account to set it as your active wallet</p>
                                </div>
                            </div>
                            {profileAccounts.length === 0 ? (
                                <div className="empty-card">No accounts found for this profile.</div>
                            ) : (
                                <div className="profile-accounts-grid">
                                    {profileAccounts.map((account) => {
                                        const isActive = activeAccountId === account.id
                                        return (
                                            <button key={account.id} type="button"
                                                    className={`wallet-card wallet-card-selectable ${isActive ? 'active-wallet-card' : ''}`}
                                                    onClick={() => handleActiveAccountChange(account.id)}>
                                                <div className="wallet-card-top">
                                                    <span className="wallet-type">{account.accountType}</span>
                                                    {isActive
                                                        ? <span className="selector-active-pill">✓ Active</span>
                                                        : <span className="wallet-select-hint">Tap to select</span>
                                                    }
                                                </div>
                                                <div className="wallet-card-balance">
                                                    ZMW {Number(account.balance).toFixed(2)}
                                                </div>
                                                <h3>{account.accountNumber}</h3>
                                                <div className="account-id-copy-row">
                                                    <p><strong>ID:</strong> {account.id}</p>
                                                    <span className="copy-btn small-copy-btn"
                                                          onClick={(e) => { e.stopPropagation(); copyAccountId(account.id) }}>
                                                        Copy
                                                    </span>
                                                </div>
                                                <p><strong>Owner:</strong> {account.ownerId}</p>
                                                {account.accountType === 'SAVINGS' && account.minimumBalance !== undefined && (
                                                    <p><strong>Min Balance:</strong> ZMW {Number(account.minimumBalance).toFixed(2)}</p>
                                                )}
                                                {account.accountType === 'MERCHANT' && account.businessRegistrationId && (
                                                    <p><strong>Business Reg ID:</strong> {account.businessRegistrationId}</p>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </section>
        )

        if (currentPage === 'create-wallet') return (
            <section className="single-page-card">
                <div className="page-header">
                    <h2>Create Wallet</h2>
                    <p>Open a standard, savings, or merchant wallet for your profile.</p>
                </div>
                <div className="info-note">
                    Logged-in User ID: <strong>{loggedInUser?.id || accountForm.userId || 'Not available'}</strong>
                </div>
                <form onSubmit={createAccount} className="single-form">
                    <div className="form-group">
                        <label className="form-label">User ID</label>
                        <input type="text" name="userId" placeholder="Your user ID"
                               value={accountForm.userId} onChange={mkChange(setAccountForm)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Account Type</label>
                        <select name="accountType" value={accountForm.accountType} onChange={mkChange(setAccountForm)}>
                            <option value="STANDARD">Standard</option>
                            <option value="SAVINGS">Savings</option>
                            <option value="MERCHANT">Merchant</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Minimum Balance</label>
                        <input type="number" name="minimumBalance" placeholder="0.00"
                               value={accountForm.minimumBalance} onChange={mkChange(setAccountForm)} />
                    </div>
                    {accountForm.accountType === 'MERCHANT' && (
                        <div className="form-group">
                            <label className="form-label">Business Registration ID</label>
                            <input type="text" name="businessRegistrationId" placeholder="e.g. BRN-123456"
                                   value={accountForm.businessRegistrationId} onChange={mkChange(setAccountForm)} />
                        </div>
                    )}
                    <button type="submit" disabled={loading}>
                        {loading ? 'Creating…' : 'Create Wallet'}
                    </button>
                </form>
            </section>
        )

        if (currentPage === 'my-accounts') return (
            <section className="single-page-card">
                <div className="page-header">
                    <h2>My Accounts</h2>
                    <p>Your linked wallet accounts.</p>
                </div>
                {myAccounts.length === 0 ? (
                    <div className="empty-card">No personal accounts loaded yet.</div>
                ) : (
                    <div className="records-top-grid">
                        {myAccounts.map((account) => (
                            <div key={account.id}
                                 className={`wallet-card ${activeAccountId === account.id ? 'active-wallet-card' : ''}`}>
                                <div className="wallet-card-top">
                                    <span className="wallet-type">{account.accountType}</span>
                                    <strong>ZMW {Number(account.balance).toFixed(2)}</strong>
                                </div>
                                <h3>{account.accountNumber}</h3>
                                <div className="account-id-copy-row">
                                    <p style={{ fontFamily: 'monospace', fontSize: '11.5px', color: 'var(--text-3)' }}>{account.id}</p>
                                    <button type="button" className="copy-btn small-copy-btn"
                                            onClick={() => copyAccountId(account.id)}>Copy</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        )

        const SimpleFormPage = ({ title, desc, onSubmit, children }) => (
            <section className="single-page-card">
                <div className="page-header"><h2>{title}</h2><p>{desc}</p></div>
                <form onSubmit={onSubmit} className="single-form">{children}</form>
            </section>
        )

        if (currentPage === 'topup') return (
            <SimpleFormPage title="Add Balance" desc="Top up your selected account or enter any account ID."
                            onSubmit={topUpAccount}>
                <div className="form-group">
                    <label className="form-label">Account ID</label>
                    <input type="text" name="accountId" placeholder="Account ID"
                           value={topUpForm.accountId} onChange={mkChange(setTopUpForm)} />
                </div>
                <div className="form-group">
                    <label className="form-label">Amount (ZMW)</label>
                    <input type="number" name="amount" placeholder="0.00"
                           value={topUpForm.amount} onChange={mkChange(setTopUpForm)} />
                </div>
                <button type="submit" disabled={loading}>{loading ? 'Processing…' : 'Top Up Account'}</button>
            </SimpleFormPage>
        )

        if (currentPage === 'withdraw') return (
            <SimpleFormPage title="Withdraw Funds" desc="Withdraw from your selected account or enter any account ID."
                            onSubmit={withdrawFromAccount}>
                <div className="form-group">
                    <label className="form-label">Account ID</label>
                    <input type="text" name="accountId" placeholder="Account ID"
                           value={withdrawForm.accountId} onChange={mkChange(setWithdrawForm)} />
                </div>
                <div className="form-group">
                    <label className="form-label">Amount (ZMW)</label>
                    <input type="number" name="amount" placeholder="0.00"
                           value={withdrawForm.amount} onChange={mkChange(setWithdrawForm)} />
                </div>
                <button type="submit" disabled={loading}>{loading ? 'Processing…' : 'Withdraw'}</button>
            </SimpleFormPage>
        )

        if (currentPage === 'send-money') return (
            <SimpleFormPage title="Send Money" desc="Transfer funds from your selected account to another."
                            onSubmit={sendMoney}>
                <div className="form-group">
                    <label className="form-label">From Account ID</label>
                    <input type="text" name="fromAccountId" placeholder="Sender Account ID"
                           value={sendMoneyForm.fromAccountId} onChange={mkChange(setSendMoneyForm)} />
                </div>
                <div className="form-group">
                    <label className="form-label">To Account ID</label>
                    <input type="text" name="toAccountId" placeholder="Recipient Account ID"
                           value={sendMoneyForm.toAccountId} onChange={mkChange(setSendMoneyForm)} />
                </div>
                <div className="form-group">
                    <label className="form-label">Amount (ZMW)</label>
                    <input type="number" name="amount" placeholder="0.00"
                           value={sendMoneyForm.amount} onChange={mkChange(setSendMoneyForm)} />
                </div>
                <label className="checkbox-row">
                    <input type="checkbox" name="merchantPayment"
                           checked={sendMoneyForm.merchantPayment} onChange={mkChange(setSendMoneyForm)} />
                    Merchant Payment
                </label>
                <button type="submit" disabled={loading}>{loading ? 'Processing…' : 'Send Money'}</button>
            </SimpleFormPage>
        )

        if (currentPage === 'transactions') return (
            <section className="single-page-card">
                <div className="page-header">
                    <h2>My Transactions</h2>
                    <p>Your recent transaction activity.</p>
                </div>
                {history.length === 0 ? (
                    <div className="empty-card">No transaction activity yet.</div>
                ) : (
                    <div className="tx-list">
                        {history.map((item, index) => (
                            <TxCard key={index} item={item} keyPrefix={`TXN-${index + 1}`} />
                        ))}
                    </div>
                )}
            </section>
        )

        if (currentPage === 'statement') return (
            <section className="single-page-card">
                <div className="page-header">
                    <h2>Account Statement</h2>
                    <p>Load your account statement and history by account ID.</p>
                </div>
                <div className="lookup-row">
                    <input type="text" placeholder="Enter Account ID"
                           value={lookupAccountId} onChange={(e) => setLookupAccountId(e.target.value)} />
                    <button onClick={loadStatementAndHistory} disabled={loading}>
                        {loading ? 'Loading…' : 'Load Statement'}
                    </button>
                </div>
                <div className="records-detail-grid">
                    <div className="record-box">
                        <h3>Account Statement</h3>
                        {statement ? (
                            <StatementCard text={statement} />
                        ) : (
                            <div className="empty-card">No statement loaded yet.</div>
                        )}
                    </div>
                    <div className="record-box">
                        <h3>Transaction History</h3>
                        {history.length === 0 ? (
                            <div className="empty-card">No transaction history loaded yet.</div>
                        ) : (
                            <div className="tx-list">
                                {history.map((item, index) => (
                                    <TxCard key={index} item={item} keyPrefix={`TXN-${index + 1}`} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </section>
        )

        return null
    }

    // ── Auth screen ───────────────────────────────────────
    if (!isLoggedIn) return (
        <div className="login-screen">
            <div className="login-left">
                <div className="login-brand-row">
                    <div className="brand-badge">ZP</div>
                    <div>
                        <h1>ZedPay</h1>
                        <p>Transparent payment solutions</p>
                    </div>
                </div>
                <div className="login-copy">
                    <span className="hero-chip">Secure Fintech</span>
                    <h2>Welcome to <span>ZedPay</span></h2>
                    <p>Access your wallet dashboard, manage balances, send money, and view only your own records — all in one place.</p>
                    <div className="login-feature-list">
                        <div className="feature-card">
                            <strong>My Wallets</strong>
                            <span>View your own linked accounts</span>
                        </div>
                        <div className="feature-card">
                            <strong>Transfers</strong>
                            <span>Send and receive funds securely</span>
                        </div>
                        <div className="feature-card">
                            <strong>My Records</strong>
                            <span>See only your own activity</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="login-right">
                <div className="login-card">
                    <div className="login-card-top">
                        <div className="brand-badge small">ZP</div>
                        <div>
                            <h3>{authMode === 'login' ? 'Sign In' : 'Create Account'}</h3>
                            <p>{authMode === 'login' ? 'Enter your details to continue' : 'Register a new ZedPay account'}</p>
                        </div>
                    </div>

                    {message && <div className="alert success">{message}</div>}
                    {error   && <div className="alert error">{error}</div>}

                    {authMode === 'login' ? (
                        <form onSubmit={handleLogin} className="single-form">
                            <div className="form-group">
                                <label className="form-label">Email Address</label>
                                <input type="email" name="email" placeholder="you@example.com"
                                       value={loginForm.email} onChange={mkChange(setLoginForm)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Password</label>
                                <input type="password" name="password" placeholder="••••••••"
                                       value={loginForm.password} onChange={mkChange(setLoginForm)} />
                            </div>
                            <button type="submit" disabled={loading} style={{ marginTop: '4px' }}>
                                {loading ? 'Signing in…' : 'Sign In'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleAuthRegister} className="single-form">
                            {[
                                { name: 'fullName',    label: 'Full Name',    type: 'text',     ph: 'John Doe' },
                                { name: 'phoneNumber', label: 'Phone Number', type: 'text',     ph: '+260 97X XXX XXX' },
                                { name: 'nationalId',  label: 'National ID',  type: 'text',     ph: 'NRC Number' },
                                { name: 'email',       label: 'Email',        type: 'email',    ph: 'you@example.com' },
                                { name: 'password',    label: 'Password',     type: 'password', ph: '••••••••' },
                            ].map(({ name, label, type, ph }) => (
                                <div key={name} className="form-group">
                                    <label className="form-label">{label}</label>
                                    <input type={type} name={name} placeholder={ph}
                                           value={registerForm[name]} onChange={mkChange(setRegisterForm)} />
                                </div>
                            ))}
                            <button type="submit" disabled={loading} style={{ marginTop: '4px' }}>
                                {loading ? 'Creating…' : 'Create Account'}
                            </button>
                        </form>
                    )}

                    <div className="auth-switch-row">
                        {authMode === 'login' ? (
                            <p>Don't have an account?{' '}
                                <button type="button" className="text-link-btn"
                                        onClick={() => { clearAlerts(); setAuthMode('register') }}>
                                    Register here
                                </button>
                            </p>
                        ) : (
                            <p>Already have an account?{' '}
                                <button type="button" className="text-link-btn"
                                        onClick={() => { clearAlerts(); setAuthMode('login') }}>
                                    Sign in
                                </button>
                            </p>
                        )}
                    </div>
                    <div className="login-footer-note">Demo login and registration flow</div>
                </div>
            </div>
        </div>
    )

    // ── App shell ─────────────────────────────────────────
    return (
        <div className="app-shell app-shell-redesigned">
            <aside className="sidebar">
                <div className="brand-block">
                    <div className="brand-badge">ZP</div>
                    <div>
                        <h1>ZedPay</h1>
                        <p>Wallet Management</p>
                    </div>
                </div>

                <nav className="side-nav">
                    {NAV_ITEMS.map(({ page, label, icon }) => (
                        <button key={page}
                                className={currentPage === page ? 'side-link active' : 'side-link'}
                                onClick={() => setCurrentPage(page)}>
                            <Icon d={icon} size={15} />
                            {label}
                        </button>
                    ))}
                </nav>

                <div className="sidebar-divider" />

                <div className="sidebar-card">
                    <h3>Wallet Summary</h3>
                    <span className="sidebar-balance">ZMW {walletSummary.totalBalance}</span>
                    <p><span>Accounts</span><strong>{walletSummary.accountCount}</strong></p>
                    <p><span>Recipients</span><strong>{recentRecipients.length}</strong></p>
                    <p><span>User</span><strong>{loggedInUser?.fullName?.split(' ')[0] || '—'}</strong></p>
                    <p><span>Active</span><strong style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                        {activeAccount?.accountNumber || '—'}
                    </strong></p>
                </div>

                <button className="logout-btn" onClick={handleLogout}>Sign Out</button>
            </aside>

            <main className="main-content redesigned-main">
                <header className="topbar">
                    <div>
                        <h2>ZedPay Digital Wallet</h2>
                        <p>End-user wallet interface · {loggedInUser?.email || ''}</p>
                    </div>
                </header>

                {message && <div className="alert success">{message}</div>}
                {error   && <div className="alert error">{error}</div>}

                {renderPage()}
            </main>
        </div>
    )
}

export default App
