class PaymentProcessor {
    processPayment(order, amount) {
        throw new Error("processPayment() must be implemented");
    }
}

module.exports = PaymentProcessor;
