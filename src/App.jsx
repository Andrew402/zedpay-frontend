import { useEffect, useState } from 'react'
import axios from 'axios'
import './App.css'

const API_BASE_URL = 'http://localhost:7070'

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [currentPage, setCurrentPage] = useState('dashboard')
    const [authMode, setAuthMode] = useState('login')
    const [loggedInUser, setLoggedInUser] = useState(null)

    const [loginForm, setLoginForm] = useState({
        email: '',
        password: '',
    })

    const [registerForm, setRegisterForm] = useState({
        fullName: '',
        phoneNumber: '',
        nationalId: '',
        email: '',
        password: '',
    })

    const [accountForm, setAccountForm] = useState({
        userId: '',
        accountType: 'STANDARD',
        minimumBalance: '',
        businessRegistrationId: '',
    })

    const [topUpForm, setTopUpForm] = useState({
        accountId: '',
        amount: '',
    })

    const [withdrawForm, setWithdrawForm] = useState({
        accountId: '',
        amount: '',
    })

    const [sendMoneyForm, setSendMoneyForm] = useState({
        fromAccountId: '',
        toAccountId: '',
        amount: '',
        merchantPayment: false,
    })

    const [lookupAccountId, setLookupAccountId] = useState('')
    const [statement, setStatement] = useState('')
    const [history, setHistory] = useState([])
    const [myAccounts, setMyAccounts] = useState([])
    const [recentRecipients, setRecentRecipients] = useState([])

    const [profileUser, setProfileUser] = useState(null)
    const [profileAccounts, setProfileAccounts] = useState([])

    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const [walletSummary, setWalletSummary] = useState({
        totalBalance: '0.00',
        accountCount: 0,
    })

    useEffect(() => {
        const savedUser = localStorage.getItem('zedpay_logged_in_user')
        const savedPage = localStorage.getItem('zedpay_current_page')

        if (savedUser) {
            const parsedUser = JSON.parse(savedUser)
            setLoggedInUser(parsedUser)
            setProfileUser(parsedUser)
            setAccountForm((prev) => ({ ...prev, userId: parsedUser.id }))
            setIsLoggedIn(true)
        }

        if (savedPage) {
            setCurrentPage(savedPage)
        }
    }, [])

    useEffect(() => {
        if (loggedInUser) {
            localStorage.setItem('zedpay_logged_in_user', JSON.stringify(loggedInUser))
        }
    }, [loggedInUser])

    useEffect(() => {
        localStorage.setItem('zedpay_current_page', currentPage)
    }, [currentPage])

    const clearAlerts = () => {
        setMessage('')
        setError('')
    }

    const showSuccess = (text) => {
        setMessage(text)
        setError('')
    }

    const showError = (text) => {
        setError(text)
        setMessage('')
    }

    const handleLoginChange = (e) => {
        const { name, value } = e.target
        setLoginForm((prev) => ({ ...prev, [name]: value }))
    }

    const handleRegisterChange = (e) => {
        const { name, value } = e.target
        setRegisterForm((prev) => ({ ...prev, [name]: value }))
    }

    const handleAccountChange = (e) => {
        const { name, value } = e.target
        setAccountForm((prev) => ({ ...prev, [name]: value }))
    }

    const handleTopUpChange = (e) => {
        const { name, value } = e.target
        setTopUpForm((prev) => ({ ...prev, [name]: value }))
    }

    const handleWithdrawChange = (e) => {
        const { name, value } = e.target
        setWithdrawForm((prev) => ({ ...prev, [name]: value }))
    }

    const handleSendMoneyChange = (e) => {
        const { name, value, type, checked } = e.target
        setSendMoneyForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }))
    }

    const handleLogin = async (e) => {
        e.preventDefault()
        clearAlerts()
        setLoading(true)

        try {
            const response = await axios.post(`${API_BASE_URL}/auth/login`, loginForm)
            const user = response.data.user

            setLoggedInUser(user)
            setProfileUser(user)
            setAccountForm((prev) => ({ ...prev, userId: user.id }))
            setIsLoggedIn(true)
            setCurrentPage('dashboard')

            localStorage.setItem('zedpay_logged_in_user', JSON.stringify(user))
            localStorage.setItem('zedpay_current_page', 'dashboard')

            showSuccess('Login successful')
        } catch (err) {
            const apiError = err.response?.data
            showError(apiError?.message || 'Failed to login')
        } finally {
            setLoading(false)
        }
    }

    const handleAuthRegister = async (e) => {
        e.preventDefault()
        clearAlerts()
        setLoading(true)

        try {
            await axios.post(`${API_BASE_URL}/users/register`, registerForm)

            showSuccess('Account created successfully. You can now log in.')

            setRegisterForm({
                fullName: '',
                phoneNumber: '',
                nationalId: '',
                email: '',
                password: '',
            })

            setAuthMode('login')
        } catch (err) {
            const apiError = err.response?.data
            showError(apiError?.message || 'Failed to create account')
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = () => {
        setIsLoggedIn(false)
        setCurrentPage('dashboard')
        setAuthMode('login')
        setLoggedInUser(null)
        setProfileUser(null)
        setProfileAccounts([])
        setLoginForm({
            email: '',
            password: '',
        })
        setMyAccounts([])
        setHistory([])
        setStatement('')
        setRecentRecipients([])
        setWalletSummary({
            totalBalance: '0.00',
            accountCount: 0,
        })

        localStorage.removeItem('zedpay_logged_in_user')
        localStorage.removeItem('zedpay_current_page')

        clearAlerts()
    }

    const createAccount = async (e) => {
        e.preventDefault()
        clearAlerts()
        setLoading(true)

        const payload = {
            userId: accountForm.userId,
            accountType: accountForm.accountType,
            minimumBalance: accountForm.minimumBalance === '' ? 0 : Number(accountForm.minimumBalance),
        }

        if (accountForm.accountType === 'MERCHANT') {
            payload.businessRegistrationId = accountForm.businessRegistrationId
        }

        try {
            const response = await axios.post(`${API_BASE_URL}/accounts/create`, payload)

            showSuccess(`Account created successfully: ${response.data.accountNumber}`)

            setAccountForm((prev) => ({
                ...prev,
                minimumBalance: '',
                businessRegistrationId: '',
            }))

            await loadMyAccounts(true)
            await loadLoggedInProfile(true)
            setCurrentPage('my-accounts')
        } catch (err) {
            const apiError = err.response?.data
            showError(apiError?.message || 'Failed to create account')
        } finally {
            setLoading(false)
        }
    }

    const topUpAccount = async (e) => {
        e.preventDefault()
        clearAlerts()
        setLoading(true)

        try {
            await axios.post(`${API_BASE_URL}/transactions/topup`, {
                accountId: topUpForm.accountId,
                amount: Number(topUpForm.amount),
            })

            showSuccess('Top up completed successfully')

            setTopUpForm({
                accountId: '',
                amount: '',
            })

            await loadMyAccounts(true)
            await loadLoggedInProfile(true)
            setCurrentPage('dashboard')
        } catch (err) {
            const apiError = err.response?.data
            showError(apiError?.message || 'Failed to top up account')
        } finally {
            setLoading(false)
        }
    }

    const withdrawFromAccount = async (e) => {
        e.preventDefault()
        clearAlerts()
        setLoading(true)

        try {
            await axios.post(`${API_BASE_URL}/transactions/withdraw`, {
                accountId: withdrawForm.accountId,
                amount: Number(withdrawForm.amount),
            })

            showSuccess('Withdrawal completed successfully')

            setWithdrawForm({
                accountId: '',
                amount: '',
            })

            await loadMyAccounts(true)
            await loadLoggedInProfile(true)
            setCurrentPage('dashboard')
        } catch (err) {
            const apiError = err.response?.data
            showError(apiError?.message || 'Failed to withdraw')
        } finally {
            setLoading(false)
        }
    }

    const sendMoney = async (e) => {
        e.preventDefault()
        clearAlerts()
        setLoading(true)

        try {
            const response = await axios.post(`${API_BASE_URL}/transactions/send`, {
                fromAccountId: sendMoneyForm.fromAccountId,
                toAccountId: sendMoneyForm.toAccountId,
                amount: Number(sendMoneyForm.amount),
                merchantPayment: sendMoneyForm.merchantPayment,
            })

            showSuccess('Money sent successfully')

            if (sendMoneyForm.toAccountId.trim()) {
                setRecentRecipients((prev) => {
                    const updated = [sendMoneyForm.toAccountId, ...prev.filter((id) => id !== sendMoneyForm.toAccountId)]
                    return updated.slice(0, 5)
                })
            }

            if (response.data?.summary) {
                setHistory((prev) => [response.data.summary, ...prev].slice(0, 10))
            }

            setSendMoneyForm({
                fromAccountId: '',
                toAccountId: '',
                amount: '',
                merchantPayment: false,
            })

            await loadMyAccounts(true)
            await loadLoggedInProfile(true)
            setCurrentPage('transactions')
        } catch (err) {
            const apiError = err.response?.data
            showError(apiError?.message || 'Failed to send money')
        } finally {
            setLoading(false)
        }
    }

    const loadMyAccounts = async (silent = false) => {
        const userIdToUse = loggedInUser?.id || accountForm.userId

        if (!userIdToUse || !userIdToUse.trim()) {
            if (!silent) {
                showError('User ID is required to load accounts')
            }
            return
        }

        if (!silent) {
            clearAlerts()
            setLoading(true)
        }

        try {
            const response = await axios.get(`${API_BASE_URL}/users/${userIdToUse}/accounts`)
            const accounts = response.data || []

            setMyAccounts(accounts)

            const totalBalance = accounts.reduce(
                (sum, account) => sum + Number(account.balance || 0),
                0
            )

            setWalletSummary({
                totalBalance: totalBalance.toFixed(2),
                accountCount: accounts.length,
            })

            if (!silent) {
                showSuccess('My accounts loaded successfully')
            }
        } catch (err) {
            if (!silent) {
                const apiError = err.response?.data
                showError(apiError?.message || 'Failed to load accounts')
            }
        } finally {
            if (!silent) {
                setLoading(false)
            }
        }
    }

    const loadStatementAndHistory = async () => {
        clearAlerts()

        if (!lookupAccountId.trim()) {
            showError('Account ID is required')
            return
        }

        setLoading(true)

        try {
            const [statementResponse, historyResponse] = await Promise.all([
                axios.get(`${API_BASE_URL}/accounts/${lookupAccountId}/statement`),
                axios.get(`${API_BASE_URL}/accounts/${lookupAccountId}/history`),
            ])

            setStatement(statementResponse.data.statement || '')
            setHistory(historyResponse.data || [])
            showSuccess('Statement and history loaded successfully')
        } catch (err) {
            const apiError = err.response?.data
            showError(apiError?.message || 'Failed to load account details')
        } finally {
            setLoading(false)
        }
    }

    const loadLoggedInProfile = async (silent = false) => {
        const userIdToUse = loggedInUser?.id

        if (!userIdToUse) {
            return
        }

        if (!silent) {
            clearAlerts()
            setLoading(true)
        }

        try {
            const [userResponse, accountsResponse] = await Promise.all([
                axios.get(`${API_BASE_URL}/users/${userIdToUse}`),
                axios.get(`${API_BASE_URL}/users/${userIdToUse}/accounts`),
            ])

            setProfileUser(userResponse.data)
            setProfileAccounts(accountsResponse.data || [])

            if (!silent) {
                showSuccess('User profile loaded successfully')
            }
        } catch (err) {
            if (!silent) {
                const apiError = err.response?.data
                showError(apiError?.message || 'Failed to load user profile')
            }
        } finally {
            if (!silent) {
                setLoading(false)
            }
        }
    }

    useEffect(() => {
        if (isLoggedIn && loggedInUser?.id) {
            loadMyAccounts(true)
            loadLoggedInProfile(true)
        }
    }, [isLoggedIn, loggedInUser])

    const copyUserId = async () => {
        if (!profileUser?.id) {
            showError('No user ID available to copy')
            return
        }

        try {
            await navigator.clipboard.writeText(profileUser.id)
            showSuccess('User ID copied successfully')
        } catch {
            showError('Failed to copy user ID')
        }
    }

    const renderPage = () => {
        if (currentPage === 'dashboard') {
            return (
                <>
                    <section className="home-hero">
                        <div className="home-hero-text">
                            <span className="hero-chip">ZedPay Wallet Platform</span>
                            <h2>Your money, your wallets, your transactions</h2>
                            <p>
                                Access your ZedPay wallet, manage balances, send money, withdraw,
                                and view only your own account records in a secure end-user interface.
                            </p>

                            <div className="hero-actions">
                                <button onClick={() => setCurrentPage('profile')}>
                                    My Profile
                                </button>
                                <button
                                    className="secondary-btn"
                                    onClick={() => setCurrentPage('send-money')}
                                >
                                    Send Money
                                </button>
                            </div>
                        </div>

                        <div className="hero-phone-card">
                            <div className="phone-top">ZedPay Wallet</div>
                            <div className="phone-balance-label">Available Balance</div>
                            <div className="phone-balance">ZMW {walletSummary.totalBalance}</div>
                            <div className="phone-mini-grid">
                                <div>
                                    <span>Wallets</span>
                                    <strong>{walletSummary.accountCount}</strong>
                                </div>
                                <div>
                                    <span>Recipients</span>
                                    <strong>{recentRecipients.length}</strong>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="stats-grid">
                        <div className="stat-card">
                            <span>Total Balance</span>
                            <strong>ZMW {walletSummary.totalBalance}</strong>
                        </div>
                        <div className="stat-card">
                            <span>My Accounts</span>
                            <strong>{walletSummary.accountCount}</strong>
                        </div>
                        <div className="stat-card">
                            <span>Recent Recipients</span>
                            <strong>{recentRecipients.length}</strong>
                        </div>
                    </section>

                    <section className="quick-links-grid">
                        <button className="quick-link-card" onClick={() => setCurrentPage('profile')}>
                            <h3>My Profile</h3>
                            <p>View profile and linked accounts</p>
                        </button>

                        <button className="quick-link-card" onClick={() => setCurrentPage('my-accounts')}>
                            <h3>My Accounts</h3>
                            <p>View only your linked wallets</p>
                        </button>

                        <button className="quick-link-card" onClick={() => setCurrentPage('send-money')}>
                            <h3>Send Money</h3>
                            <p>Transfer funds to another account</p>
                        </button>

                        <button className="quick-link-card" onClick={() => setCurrentPage('statement')}>
                            <h3>Statement</h3>
                            <p>Load account statement and history</p>
                        </button>
                    </section>

                    <section className="dashboard-bottom-grid">
                        <div className="content-card">
                            <div className="section-title-row">
                                <div>
                                    <h3>Recent Recipients</h3>
                                    <p>People or accounts you transacted with</p>
                                </div>
                            </div>

                            {recentRecipients.length === 0 ? (
                                <div className="empty-card">
                                    No recent recipients yet.
                                </div>
                            ) : (
                                <div className="snapshot-list">
                                    {recentRecipients.map((recipient, index) => (
                                        <div key={`${recipient}-${index}`} className="snapshot-item">
                                            <div>
                                                <strong>Recipient Account</strong>
                                                <p>{recipient}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="content-card">
                            <div className="section-title-row">
                                <div>
                                    <h3>Quick Wallet Actions</h3>
                                    <p>Move money easily</p>
                                </div>
                            </div>

                            <div className="snapshot-list">
                                <button className="quick-action-btn" onClick={() => setCurrentPage('topup')}>
                                    Add Balance
                                </button>
                                <button className="quick-action-btn" onClick={() => setCurrentPage('withdraw')}>
                                    Withdraw Funds
                                </button>
                                <button className="quick-action-btn" onClick={() => setCurrentPage('send-money')}>
                                    Transfer Funds
                                </button>
                                <button className="quick-action-btn" onClick={() => setCurrentPage('statement')}>
                                    View Statement
                                </button>
                            </div>
                        </div>
                    </section>
                </>
            )
        }

        if (currentPage === 'profile') {
            return (
                <section className="single-page-card">
                    <div className="page-header">
                        <h2>My Profile</h2>
                        <p>View your profile information and all accounts registered under it.</p>
                    </div>

                    {!profileUser ? (
                        <div className="empty-card">
                            No profile loaded yet.
                        </div>
                    ) : (
                        <div className="profile-layout">
                            <div className="profile-card">
                                <div className="profile-top">
                                    <div className="profile-avatar">
                                        {profileUser.fullName ? profileUser.fullName.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                    <div>
                                        <h3>{profileUser.fullName}</h3>
                                        <p>User Profile</p>
                                    </div>
                                </div>

                                <div className="profile-user-id-bar">
                                    <div>
                                        <span>User ID</span>
                                        <strong>{profileUser.id}</strong>
                                    </div>
                                    <button type="button" className="copy-btn" onClick={copyUserId}>
                                        Copy ID
                                    </button>
                                </div>

                                <div className="profile-details-grid">
                                    <div className="profile-detail-box">
                                        <span>Phone Number</span>
                                        <strong>{profileUser.phoneNumber}</strong>
                                    </div>

                                    <div className="profile-detail-box">
                                        <span>National ID</span>
                                        <strong>{profileUser.nationalId}</strong>
                                    </div>

                                    <div className="profile-detail-box">
                                        <span>Email</span>
                                        <strong>{profileUser.email}</strong>
                                    </div>

                                    <div className="profile-detail-box">
                                        <span>Total Accounts</span>
                                        <strong>{profileAccounts.length}</strong>
                                    </div>
                                </div>
                            </div>

                            <div className="profile-accounts-section">
                                <div className="section-title-row">
                                    <div>
                                        <h3>Registered Accounts</h3>
                                        <p>Accounts linked to this profile</p>
                                    </div>
                                </div>

                                {profileAccounts.length === 0 ? (
                                    <div className="empty-card">
                                        No accounts found for this profile.
                                    </div>
                                ) : (
                                    <div className="profile-accounts-grid">
                                        {profileAccounts.map((account) => (
                                            <div key={account.id} className="wallet-card">
                                                <div className="wallet-card-top">
                                                    <span className="wallet-type">{account.accountType}</span>
                                                    <strong>ZMW {Number(account.balance).toFixed(2)}</strong>
                                                </div>

                                                <h3>{account.accountNumber}</h3>
                                                <p><strong>Account ID:</strong> {account.id}</p>
                                                <p><strong>Owner ID:</strong> {account.ownerId}</p>

                                                {account.accountType === 'SAVINGS' && account.minimumBalance !== undefined && (
                                                    <p><strong>Minimum Balance:</strong> ZMW {Number(account.minimumBalance).toFixed(2)}</p>
                                                )}

                                                {account.accountType === 'MERCHANT' && account.businessRegistrationId && (
                                                    <p><strong>Business Registration ID:</strong> {account.businessRegistrationId}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </section>
            )
        }

        if (currentPage === 'create-wallet') {
            return (
                <section className="single-page-card">
                    <div className="page-header">
                        <h2>Create Wallet</h2>
                        <p>Open a standard, savings, or merchant wallet for your user profile.</p>
                    </div>

                    <div className="info-note">
                        Logged-in User ID: <strong>{loggedInUser?.id || accountForm.userId || 'Not available yet'}</strong>
                    </div>

                    <form onSubmit={createAccount} className="single-form">
                        <input
                            type="text"
                            name="userId"
                            placeholder="User ID"
                            value={accountForm.userId}
                            onChange={handleAccountChange}
                        />

                        <select
                            name="accountType"
                            value={accountForm.accountType}
                            onChange={handleAccountChange}
                        >
                            <option value="STANDARD">STANDARD</option>
                            <option value="SAVINGS">SAVINGS</option>
                            <option value="MERCHANT">MERCHANT</option>
                        </select>

                        <input
                            type="number"
                            name="minimumBalance"
                            placeholder="Minimum Balance"
                            value={accountForm.minimumBalance}
                            onChange={handleAccountChange}
                        />

                        {accountForm.accountType === 'MERCHANT' && (
                            <input
                                type="text"
                                name="businessRegistrationId"
                                placeholder="Business Registration ID"
                                value={accountForm.businessRegistrationId}
                                onChange={handleAccountChange}
                            />
                        )}

                        <button type="submit" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Wallet'}
                        </button>
                    </form>
                </section>
            )
        }

        if (currentPage === 'my-accounts') {
            return (
                <section className="single-page-card">
                    <div className="page-header">
                        <h2>My Accounts</h2>
                        <p>Only your own linked wallet accounts are shown here.</p>
                    </div>

                    {myAccounts.length === 0 ? (
                        <div className="empty-card">No personal accounts loaded yet.</div>
                    ) : (
                        <div className="records-top-grid">
                            {myAccounts.map((account) => (
                                <div key={account.id} className="wallet-card">
                                    <div className="wallet-card-top">
                                        <span className="wallet-type">{account.accountType}</span>
                                        <strong>ZMW {Number(account.balance).toFixed(2)}</strong>
                                    </div>
                                    <h3>{account.accountNumber}</h3>
                                    <p>{account.id}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )
        }

        if (currentPage === 'topup') {
            return (
                <section className="single-page-card">
                    <div className="page-header">
                        <h2>Add Balance</h2>
                        <p>Top up one of your wallet accounts.</p>
                    </div>

                    <form onSubmit={topUpAccount} className="single-form">
                        <input
                            type="text"
                            name="accountId"
                            placeholder="Account ID"
                            value={topUpForm.accountId}
                            onChange={handleTopUpChange}
                        />
                        <input
                            type="number"
                            name="amount"
                            placeholder="Amount"
                            value={topUpForm.amount}
                            onChange={handleTopUpChange}
                        />
                        <button type="submit" disabled={loading}>
                            {loading ? 'Processing...' : 'Top Up Account'}
                        </button>
                    </form>
                </section>
            )
        }

        if (currentPage === 'withdraw') {
            return (
                <section className="single-page-card">
                    <div className="page-header">
                        <h2>Withdraw Funds</h2>
                        <p>Withdraw from one of your accounts.</p>
                    </div>

                    <form onSubmit={withdrawFromAccount} className="single-form">
                        <input
                            type="text"
                            name="accountId"
                            placeholder="Account ID"
                            value={withdrawForm.accountId}
                            onChange={handleWithdrawChange}
                        />
                        <input
                            type="number"
                            name="amount"
                            placeholder="Amount"
                            value={withdrawForm.amount}
                            onChange={handleWithdrawChange}
                        />
                        <button type="submit" disabled={loading}>
                            {loading ? 'Processing...' : 'Withdraw'}
                        </button>
                    </form>
                </section>
            )
        }

        if (currentPage === 'send-money') {
            return (
                <section className="single-page-card">
                    <div className="page-header">
                        <h2>Send Money</h2>
                        <p>Transfer money to another account you know or use often.</p>
                    </div>

                    <form onSubmit={sendMoney} className="single-form">
                        <input
                            type="text"
                            name="fromAccountId"
                            placeholder="Sender Account ID"
                            value={sendMoneyForm.fromAccountId}
                            onChange={handleSendMoneyChange}
                        />
                        <input
                            type="text"
                            name="toAccountId"
                            placeholder="Receiver Account ID"
                            value={sendMoneyForm.toAccountId}
                            onChange={handleSendMoneyChange}
                        />
                        <input
                            type="number"
                            name="amount"
                            placeholder="Amount"
                            value={sendMoneyForm.amount}
                            onChange={handleSendMoneyChange}
                        />

                        <label className="checkbox-row">
                            <input
                                type="checkbox"
                                name="merchantPayment"
                                checked={sendMoneyForm.merchantPayment}
                                onChange={handleSendMoneyChange}
                            />
                            Merchant Payment
                        </label>

                        <button type="submit" disabled={loading}>
                            {loading ? 'Processing...' : 'Send Money'}
                        </button>
                    </form>
                </section>
            )
        }

        if (currentPage === 'transactions') {
            return (
                <section className="single-page-card">
                    <div className="page-header">
                        <h2>My Transactions</h2>
                        <p>Only your recent transaction activity is shown here.</p>
                    </div>

                    {history.length === 0 ? (
                        <div className="empty-card">No transaction activity yet.</div>
                    ) : (
                        <div className="history-list">
                            {history.map((item, index) => (
                                <div key={`${item}-${index}`} className="history-item">
                                    <span className="history-dot"></span>
                                    <div>{item}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )
        }

        if (currentPage === 'statement') {
            return (
                <section className="single-page-card">
                    <div className="page-header">
                        <h2>Statement</h2>
                        <p>Load your account statement and history by account ID.</p>
                    </div>

                    <div className="lookup-row">
                        <input
                            type="text"
                            placeholder="Enter Account ID"
                            value={lookupAccountId}
                            onChange={(e) => setLookupAccountId(e.target.value)}
                        />
                        <button onClick={loadStatementAndHistory} disabled={loading}>
                            {loading ? 'Loading...' : 'Load Statement'}
                        </button>
                    </div>

                    <div className="records-detail-grid">
                        <div className="record-box">
                            <h3>Account Statement</h3>
                            {statement ? (
                                <div className="statement-display">{statement}</div>
                            ) : (
                                <div className="empty-card">No statement loaded yet.</div>
                            )}
                        </div>

                        <div className="record-box">
                            <h3>Transaction History</h3>
                            {history.length === 0 ? (
                                <div className="empty-card">No transaction history loaded yet.</div>
                            ) : (
                                <div className="history-list">
                                    {history.map((item, index) => (
                                        <div key={`${item}-${index}`} className="history-item">
                                            <span className="history-dot"></span>
                                            <div>{item}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            )
        }

        return null
    }

    if (!isLoggedIn) {
        return (
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
                        <span className="hero-chip">Secure fintech</span>
                        <h2>Welcome to ZedPay</h2>
                        <p>
                            Access your wallet dashboard, manage balances, send money, withdraw,
                            and view only your own wallet records.
                        </p>

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
                                <h3>{authMode === 'login' ? 'Login' : 'Create Account'}</h3>
                                <p>
                                    {authMode === 'login'
                                        ? 'Enter your details to continue'
                                        : 'Register if you do not have an account yet'}
                                </p>
                            </div>
                        </div>

                        {message && <div className="alert success">{message}</div>}
                        {error && <div className="alert error">{error}</div>}

                        {authMode === 'login' ? (
                            <form onSubmit={handleLogin} className="single-form">
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Email Address"
                                    value={loginForm.email}
                                    onChange={handleLoginChange}
                                />
                                <input
                                    type="password"
                                    name="password"
                                    placeholder="Password"
                                    value={loginForm.password}
                                    onChange={handleLoginChange}
                                />
                                <button type="submit" disabled={loading}>
                                    {loading ? 'Logging in...' : 'Login to Dashboard'}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleAuthRegister} className="single-form">
                                <input
                                    type="text"
                                    name="fullName"
                                    placeholder="Full Name"
                                    value={registerForm.fullName}
                                    onChange={handleRegisterChange}
                                />
                                <input
                                    type="text"
                                    name="phoneNumber"
                                    placeholder="Phone Number"
                                    value={registerForm.phoneNumber}
                                    onChange={handleRegisterChange}
                                />
                                <input
                                    type="text"
                                    name="nationalId"
                                    placeholder="National ID"
                                    value={registerForm.nationalId}
                                    onChange={handleRegisterChange}
                                />
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Email Address"
                                    value={registerForm.email}
                                    onChange={handleRegisterChange}
                                />
                                <input
                                    type="password"
                                    name="password"
                                    placeholder="Password"
                                    value={registerForm.password}
                                    onChange={handleRegisterChange}
                                />
                                <button type="submit" disabled={loading}>
                                    {loading ? 'Creating...' : 'Create Account'}
                                </button>
                            </form>
                        )}

                        <div className="auth-switch-row">
                            {authMode === 'login' ? (
                                <p>
                                    Don’t have an account?{' '}
                                    <button
                                        type="button"
                                        className="text-link-btn"
                                        onClick={() => {
                                            clearAlerts()
                                            setAuthMode('register')
                                        }}
                                    >
                                        Register here
                                    </button>
                                </p>
                            ) : (
                                <p>
                                    Already have an account?{' '}
                                    <button
                                        type="button"
                                        className="text-link-btn"
                                        onClick={() => {
                                            clearAlerts()
                                            setAuthMode('login')
                                        }}
                                    >
                                        Back to login
                                    </button>
                                </p>
                            )}
                        </div>

                        <div className="login-footer-note">
                            Demo login and registration flow for the frontend presentation.
                        </div>
                    </div>
                </div>
            </div>
        )
    }

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
                    <button
                        className={currentPage === 'dashboard' ? 'side-link active' : 'side-link'}
                        onClick={() => setCurrentPage('dashboard')}
                    >
                        Dashboard
                    </button>
                    <button
                        className={currentPage === 'profile' ? 'side-link active' : 'side-link'}
                        onClick={() => setCurrentPage('profile')}
                    >
                        My Profile
                    </button>
                    <button
                        className={currentPage === 'create-wallet' ? 'side-link active' : 'side-link'}
                        onClick={() => setCurrentPage('create-wallet')}
                    >
                        Create Wallet
                    </button>
                    <button
                        className={currentPage === 'my-accounts' ? 'side-link active' : 'side-link'}
                        onClick={() => setCurrentPage('my-accounts')}
                    >
                        My Accounts
                    </button>
                    <button
                        className={currentPage === 'topup' ? 'side-link active' : 'side-link'}
                        onClick={() => setCurrentPage('topup')}
                    >
                        Add Balance
                    </button>
                    <button
                        className={currentPage === 'withdraw' ? 'side-link active' : 'side-link'}
                        onClick={() => setCurrentPage('withdraw')}
                    >
                        Withdraw
                    </button>
                    <button
                        className={currentPage === 'send-money' ? 'side-link active' : 'side-link'}
                        onClick={() => setCurrentPage('send-money')}
                    >
                        Send Money
                    </button>
                    <button
                        className={currentPage === 'transactions' ? 'side-link active' : 'side-link'}
                        onClick={() => setCurrentPage('transactions')}
                    >
                        My Transactions
                    </button>
                    <button
                        className={currentPage === 'statement' ? 'side-link active' : 'side-link'}
                        onClick={() => setCurrentPage('statement')}
                    >
                        Statement
                    </button>
                </nav>

                <div className="sidebar-card">
                    <h3>My Wallet Summary</h3>
                    <p>Accounts: {walletSummary.accountCount}</p>
                    <p>Total Balance: ZMW {walletSummary.totalBalance}</p>
                    <p>Recipients: {recentRecipients.length}</p>
                    <p>User: {loggedInUser?.fullName || 'Not loaded'}</p>
                </div>

                <button className="logout-btn" onClick={handleLogout}>
                    Logout
                </button>
            </aside>

            <main className="main-content redesigned-main">
                <header className="topbar">
                    <div>
                        <h2>ZedPay Digital Wallet</h2>
                        <p>End-user wallet interface connected to the live backend</p>
                    </div>
                </header>

                {message && <div className="alert success">{message}</div>}
                {error && <div className="alert error">{error}</div>}

                {renderPage()}
            </main>
        </div>
    )
}

export default App