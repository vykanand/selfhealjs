const assert = require('assert');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const CreditCardPaymentProcessor = require('../services/CreditCardPaymentProcessor');

describe('Order Creation and Payment Processing', function() {
    it('should create an order with products and process payment', function() {
        // Create products
        const product1 = new Product(1, 'Laptop', 999.99);
        const product2 = new Product(2, 'Mouse', 19.99);

        // Create a customer
        const customer = new Customer(1, 'John Doe', 'john.doe@example.com');

        // Create an order and add products
        const order = new Order(1001, customer);
        order.addProduct(product1);
        order.addProduct(product2);

        // Verify order summary
        const expectedSummary = 'Order #1001 for John Doe: 2 items, Total: $1019.98';
        assert.strictEqual(order.getOrderSummary(), expectedSummary);

        // Process payment
        const paymentProcessor = new CreditCardPaymentProcessor();
        const paymentResult = paymentProcessor.processPayment(order, 1019.98);

        // Verify payment processing
        assert.strictEqual(paymentResult, 'Payment of $1019.98 processed for order #1001');
    });
});
