class Order {
    constructor(orderId, customer, products = []) {
        this.orderId = orderId;
        this.customer = customer;
        this.products = products;
    }

    addProduct(product) {
        this.products.push(product);
    }

    getOrderSummary() {
        const productNames = this.products.map(p => p.name).join(', ');
        return `Order [ID: ${this.orderId}, Customer: ${this.customer.name}, Products: [${productNames}]]`;
    }
}

module.exports = Order;
