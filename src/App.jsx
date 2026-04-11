import { useEffect, useState } from 'react'
import axios from 'axios'
import './App.css'

const API_BASE_URL = 'http://localhost:7070'

function App() {
  const [registerForm, setRegisterForm] = useState({
    fullName: '',
    phoneNumber: '',
    nationalId: '',
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

  const [sendMoneyForm, setSendMoneyForm] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    merchantPayment: false,
  })

  const [users, setUsers] = useState([])
  const [accounts, setAccounts] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingAccounts, setLoadingAccounts] = useState(false)

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

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true)
      const response = await axios.get(`${API_BASE_URL}/users`)
      setUsers(response.data)
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to fetch users')
    } finally {
      setLoadingUsers(false)
    }
  }

  const fetchAccounts = async () => {
    try {
      setLoadingAccounts(true)
      const response = await axios.get(`${API_BASE_URL}/accounts`)
      setAccounts(response.data)
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to fetch accounts')
    } finally {
      setLoadingAccounts(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchAccounts()
  }, [])

  const handleRegisterChange = (e) => {
    const { name, value } = e.target
    setRegisterForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleAccountChange = (e) => {
    const { name, value } = e.target
    setAccountForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleTopUpChange = (e) => {
    const { name, value } = e.target
    setTopUpForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSendMoneyChange = (e) => {
    const { name, value, type, checked } = e.target
    setSendMoneyForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const registerUser = async (e) => {
    e.preventDefault()
    clearAlerts()

    try {
      const response = await axios.post(`${API_BASE_URL}/users/register`, registerForm)
      showSuccess(`User registered successfully: ${response.data.fullName}`)

      setRegisterForm({
        fullName: '',
        phoneNumber: '',
        nationalId: '',
      })

      fetchUsers()
      fetchAccounts()
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to register user')
    }
  }

  const createAccount = async (e) => {
    e.preventDefault()
    clearAlerts()

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

      setAccountForm({
        userId: '',
        accountType: 'STANDARD',
        minimumBalance: '',
        businessRegistrationId: '',
      })

      fetchAccounts()
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to create account')
    }
  }

  const topUpAccount = async (e) => {
    e.preventDefault()
    clearAlerts()

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

      fetchAccounts()
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to top up account')
    }
  }

  const sendMoney = async (e) => {
    e.preventDefault()
    clearAlerts()

    try {
      await axios.post(`${API_BASE_URL}/transactions/send`, {
        fromAccountId: sendMoneyForm.fromAccountId,
        toAccountId: sendMoneyForm.toAccountId,
        amount: Number(sendMoneyForm.amount),
        merchantPayment: sendMoneyForm.merchantPayment,
      })

      showSuccess('Money sent successfully')

      setSendMoneyForm({
        fromAccountId: '',
        toAccountId: '',
        amount: '',
        merchantPayment: false,
      })

      fetchAccounts()
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to send money')
    }
  }

  return (
      <div className="app">
        <header className="app-header">
          <h1>ZedPay Frontend Dashboard</h1>
          <p>React frontend connected to the Javalin backend</p>
        </header>

        {message && <div className="alert success">{message}</div>}
        {error && <div className="alert error">{error}</div>}

        <div className="grid">
          <section className="card">
            <h2>Register User</h2>
            <form onSubmit={registerUser}>
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
              <button type="submit">Register User</button>
            </form>
          </section>

          <section className="card">
            <h2>Create Account</h2>
            <form onSubmit={createAccount}>
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

              <button type="submit">Create Account</button>
            </form>
          </section>

          <section className="card">
            <h2>Top Up Account</h2>
            <form onSubmit={topUpAccount}>
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
              <button type="submit">Top Up</button>
            </form>
          </section>

          <section className="card">
            <h2>Send Money</h2>
            <form onSubmit={sendMoney}>
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

              <button type="submit">Send Money</button>
            </form>
          </section>
        </div>

        <div className="grid lower-grid">
          <section className="card">
            <div className="section-header">
              <h2>Users</h2>
              <button type="button" onClick={fetchUsers}>Refresh Users</button>
            </div>

            {loadingUsers ? (
                <p>Loading users...</p>
            ) : users.length === 0 ? (
                <p>No users found.</p>
            ) : (
                <div className="list">
                  {users.map((user) => (
                      <div key={user.id} className="list-item">
                        <p><strong>ID:</strong> {user.id}</p>
                        <p><strong>Name:</strong> {user.fullName}</p>
                        <p><strong>Phone:</strong> {user.phoneNumber}</p>
                        <p><strong>National ID:</strong> {user.nationalId}</p>
                      </div>
                  ))}
                </div>
            )}
          </section>

          <section className="card">
            <div className="section-header">
              <h2>Accounts</h2>
              <button type="button" onClick={fetchAccounts}>Refresh Accounts</button>
            </div>

            {loadingAccounts ? (
                <p>Loading accounts...</p>
            ) : accounts.length === 0 ? (
                <p>No accounts found.</p>
            ) : (
                <div className="list">
                  {accounts.map((account) => (
                      <div key={account.id} className="list-item">
                        <p><strong>ID:</strong> {account.id}</p>
                        <p><strong>Account Number:</strong> {account.accountNumber}</p>
                        <p><strong>Owner ID:</strong> {account.ownerId}</p>
                        <p><strong>Type:</strong> {account.accountType}</p>
                        <p><strong>Balance:</strong> {account.balance}</p>
                      </div>
                  ))}
                </div>
            )}
          </section>
        </div>
      </div>
  )
}

export default App
