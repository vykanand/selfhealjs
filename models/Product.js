class Product {
    constructor(id, name, price) {
        this.id = id;
        this.name = name;
        this.price = price;
    }

    getDetails() {
        return `Product [ID: ${this.id}, Name: ${this.name}, Price: $${this.price}]`;
    }
}

module.exports = Product;
