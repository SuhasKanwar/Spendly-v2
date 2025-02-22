contract ReactiveBuySell {
    address public owner;
    uint256 public someValue;

    constructor(address _owner, uint256 _someValue) {
        owner = _owner;
        someValue = _someValue;
    }
}