// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract SikaPay {
    error InvoiceAlreadyExists();
    error InvoiceNotFound();
    error InvoiceAlreadyPaid();
    error IncorrectEthAmount();
    error EthTransferFailed();
    error TokenTransferFailed();
    error Unauthorized();

    struct Invoice {
        bytes32 merchantId;
        bool exists;
        bool paid;
        address payer;
        uint64 paidAt;
    }

    address public immutable operator;
    address public immutable settlementWallet;
    mapping(bytes32 => Invoice) private invoices;
    bytes32[] private paymentHistory;

    event InvoiceCreated(
        bytes32 indexed invoiceId,
        bytes32 indexed merchantId,
        address indexed creator
    );
    event PaymentCompleted(
        bytes32 indexed invoiceId,
        bytes32 indexed merchantId,
        address indexed payer,
        address token,
        uint256 amount,
        uint256 timestamp
    );

    constructor(address _settlementWallet) {
        if (_settlementWallet == address(0)) revert Unauthorized();
        operator = msg.sender;
        settlementWallet = _settlementWallet;
    }

    function createInvoice(
        bytes32 invoiceId,
        bytes32 merchantId
    ) external {
        if (msg.sender != operator) revert Unauthorized();
        if (invoices[invoiceId].exists) revert InvoiceAlreadyExists();
        invoices[invoiceId] = Invoice(merchantId, true, false, address(0), 0);
        emit InvoiceCreated(invoiceId, merchantId, msg.sender);
    }

    function payInvoice(bytes32 invoiceId, address token, uint256 amount) external payable {
        Invoice storage invoice = invoices[invoiceId];
        if (!invoice.exists) revert InvoiceNotFound();
        if (invoice.paid) revert InvoiceAlreadyPaid();
        if (amount == 0) revert IncorrectEthAmount();

        invoice.paid = true;
        invoice.payer = msg.sender;
        invoice.paidAt = uint64(block.timestamp);

        if (token == address(0)) {
            if (msg.value != amount) revert IncorrectEthAmount();
            (bool sent,) = settlementWallet.call{value: msg.value}("");
            if (!sent) revert EthTransferFailed();
        } else {
            if (msg.value != 0) revert IncorrectEthAmount();
            if (!IERC20(token).transferFrom(msg.sender, settlementWallet, amount)) {
                revert TokenTransferFailed();
            }
        }

        paymentHistory.push(invoiceId);
        emit PaymentCompleted(
            invoiceId,
            invoice.merchantId,
            msg.sender,
            token,
            amount,
            block.timestamp
        );
    }

    function getInvoice(bytes32 invoiceId) external view returns (Invoice memory) {
        return invoices[invoiceId];
    }

    function getPaymentHistory() external view returns (bytes32[] memory) {
        return paymentHistory;
    }
}
