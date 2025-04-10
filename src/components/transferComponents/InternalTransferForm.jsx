import React, { useState, useEffect } from 'react';
import { Modal, Box, Typography, TextField, Button, MenuItem } from '@mui/material';
import { createInternalTransfer, createExchangeTransfer, verifyOTP, fetchAccountsForUser, fetchExchangeRatesForCurrency, previewExchangeTransfer } from "../../services/AxiosBanking";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";

const InternalTransferForm = () => {
    const [accounts, setAccounts] = useState([]);
    const [outflowAccount, setOutflowAccount] = useState('');
    const [inflowAccount, setInflowAccount] = useState('');
    const [outflowAccountNumber, setOutflowAccountNumber] = useState('');
    const [inflowAccountNumber, setInflowAccountNumber] = useState('');
    const [amount, setAmount] = useState('');
    const [transactionId, setTransactionId] = useState('');
    const [modalStep, setModalStep] = useState('details');
    const [showModal, setShowModal] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const navigate = useNavigate();
    const [fromExchangeRate, setFromExchangeRate] = useState(1);
    const [toExchangeRate, setToExchangeRate] = useState(1);
    const [provision, setProvision] = useState(0);
    const [finalAmount, setFinalAmount] = useState(0);


    useEffect(() => {
        const getAccounts = async () => {
            try {
                const response = await fetchAccountsForUser();
                setAccounts(response);
            } catch (error) {
                console.error("Error fetching accounts:", error);
            }
        };
        getAccounts();
    }, []);

    const selectedOutflow = accounts.find(acc => acc.id === outflowAccount);
    const selectedInflow = accounts.find(acc => acc.id === inflowAccount);
    const currency = selectedOutflow ? selectedOutflow.currencyType : '';
    const currency2 = selectedInflow ? selectedInflow.currencyType : '';
    const conversion = currency != currency2;
    const filteredInflowAccounts = accounts.filter(account => account.id !== outflowAccount);

    const handleOutflowChange = (e) => {
        const selectedAccount = accounts.find(acc => acc.id === Number(e.target.value));
        setOutflowAccount(selectedAccount.id);
        setOutflowAccountNumber(selectedAccount.accountNumber);
        setInflowAccount('');
        setInflowAccountNumber('');
    };

    const handleInflowChange = (e) => {
        const selectedAccount = accounts.find(acc => acc.id === Number(e.target.value));
        setInflowAccount(selectedAccount.id);
        setInflowAccountNumber(selectedAccount.accountNumber);
    };


    const handleAmountChange = (e) => {
        let value = e.target.value.replace(',', '.');
        if (/^\d*\.?\d*$/.test(value)) setAmount(value);
    };

    const handleContinue = async () => {
        setShowModal(true);
        setModalStep('details');

        try {
            // const response = await fetchExchangeRatesForCurrency(currency);
            const response = await previewExchangeTransfer(currency, currency2, amount);
            if ("exchangeRate" in response) {
                if (currency === "RSD") {
                    setToExchangeRate(response.exchangeRate.toFixed(5))
                } else {
                    setFromExchangeRate(response.exchangeRate.toFixed(5))
                }
            } else {
                setFromExchangeRate(response.firstExchangeRate.toFixed(5));
                setToExchangeRate(response.secondExchangeRate.toFixed(5));   
            }
              setProvision(response.provision);
              setFinalAmount(response.finalAmount);
            // const rate = response.data.rates.find(rate => rate.targetCurrency === currency2);
            // if (rate) {
            //     setExchangeRate(rate.exchangeRate);
            // }
            // else setExchangeRate(1);
            console.log("res", response);
        } catch (error) {
            console.error("Error fetching exchange rates:", error);
        }
    };


    const handleConfirmTransfer = async () => {
        try {
            let response;
            if (conversion) {
                response = await createExchangeTransfer({
                    accountFrom: outflowAccount,
                    accountTo: inflowAccount,
                    amount: parseFloat(amount)
                });
            } else {
                response = await createInternalTransfer({
                    fromAccountId: outflowAccount,
                    toAccountId: inflowAccount,
                    amount: parseFloat(amount)
                });
            }
            setTransactionId(response.data.transferId);
            setModalStep('verification');
        } catch (error) {
            console.error("Error during transfer:", error);
        }
    };

    const handleConfirmVerification = async () => {
        try {
            const response = await verifyOTP(
                {
                    transferId: transactionId,
                    otpCode: verificationCode
                });
            if (response.status === 200) {
                toast.success("Transaction successfully verified!", { autoClose: 3000 });
                setShowModal(false);
                navigate('/customer-home');
            } else {
                toast.error("Invalid OTP.", { autoClose: 3000 });
            }
        } catch (error) {
            toast.error("Error verifying OTP.", { autoClose: 3000 });
        }
    };
    const onClose = () => {
        setShowModal(false);
        setVerificationCode("");
    };


    return (
        <div style={{padding: '20px', marginTop: '64px'}}>
            <h1>New Internal Transfer</h1>
            <Box
                component="form"
                sx={{
                    '& .MuiTextField-root': {m: 1, width: '25ch'},
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2
                }}
                noValidate
                autoComplete="off"
            >
                <TextField
                    id="outflow-account"
                    select
                    label="Outflow Account"
                    value={outflowAccount}
                    onChange={handleOutflowChange}
                    helperText="Please select your outflow account"
                >
                    {accounts.map((option) => (
                        <MenuItem key={option.id} value={option.id}>
                            {option.accountNumber} {/* Prikazujemo broj računa */}
                        </MenuItem>
                    ))}
                </TextField>

                <TextField
                    id="inflow-account"
                    select
                    label="Inflow Account"
                    value={inflowAccount}
                    onChange={handleInflowChange}
                    helperText="Please select your inflow account"
                    disabled={!outflowAccount}
                >
                    {filteredInflowAccounts.map((option) => (
                        <MenuItem key={option.id} value={option.id}>
                            {option.accountNumber} {/* Prikazujemo broj računa */}
                        </MenuItem>
                    ))}
                </TextField>


                {/* Input for amount and displaying the currency */}
                <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                    <TextField
                        id="amount"
                        label="Amount"
                        type="text"
                        value={amount}
                        onChange={handleAmountChange}
                        sx={{width: '25ch'}}
                        disabled={!outflowAccount} // Disable ako outflow account nije selektovan
                    />
                    <Typography variant="body1">
                        {currency} {/* valuta koju ima outflow account */}
                    </Typography>
                </Box>

                {/* Continue Button */}
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleContinue}
                    disabled={!outflowAccount || !inflowAccount || !amount} // Disable ako forma nije popunjena
                    sx={{width: '30ch'}}
                >
                    Continue
                </Button>
            </Box>
            <Modal open={showModal} onClose={() => setShowModal(false)}>
                <Box sx={{
                    p: 4,
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    boxShadow: 24,
                    width: 400,
                    margin: 'auto',
                    mt: '20vh'
                }}>
                    {modalStep === 'details' ? (
                        <>
                            <Typography variant="h6">Transfer Details</Typography>
                            <Typography><strong>From account:</strong> {outflowAccountNumber}</Typography>
                            <Typography><strong>Amount:</strong> {amount} {currency}</Typography>
                            <Typography><strong>To account:</strong> {inflowAccountNumber}</Typography>
                            <Typography>
                                <strong>Final Amount:</strong> {finalAmount.toFixed(3)}
                            </Typography>
                            <Typography>
                                {currency === 'RSD'
                                    ? <></>
                                    : <strong>{currency} to RSD Exchange rate: {' '} {fromExchangeRate}</strong> 
                                }
                                </Typography>

                                <Typography>
                                {currency2 === 'RSD'
                                    ? <></>
                                    : <strong>{currency2} from RSD Exchange rate: {' '} {toExchangeRate}</strong>
                                }
                                </Typography>
                            <Typography>
                                <strong>Provision:</strong>  {provision.toFixed(3)}
                            </Typography>
                            <Box sx={{display: 'flex', justifyContent: 'space-between', mt: 2}}>
                                <Button variant="outlined" onClick={onClose}>Cancel</Button>
                                <Button variant="contained" onClick={handleConfirmTransfer}>Continue</Button>
                            </Box>
                        </>
                    ) : (
                        <>
                            <Typography variant="h6">Enter Verification Code</Typography>
                            <TextField label="Verification Code" value={verificationCode}
                                       onChange={(e) => setVerificationCode(e.target.value)} fullWidth/>
                            <Box sx={{display: 'flex', justifyContent: 'space-between', mt: 2}}>
                                <Button variant="outlined" onClick={onClose}>Cancel</Button>
                                <Button variant="contained" onClick={handleConfirmVerification}
                                        disabled={!verificationCode}>Confirm</Button>
                            </Box>
                        </>
                    )}
                </Box>
            </Modal>
            <ToastContainer position="bottom-right" />
        </div>
    );
};

export default InternalTransferForm;