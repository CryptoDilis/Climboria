// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;
import {V4GenesisLocalFixture,V4ClosedReserveFixture} from "../src/V4GenesisLocalFixture.sol";
interface VmV4 {
    function chainId(uint256) external;
    function prank(address) external;
    function expectRevert(bytes4) external;
    function addr(uint256) external returns(address);
}
contract V4GenesisLocalTest {
    VmV4 constant vm=VmV4(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant MARKETING=address(0x100001);
    address constant PAYEE=address(0x100002);
    V4GenesisLocalFixture token;
    function setUp() public { vm.chainId(31337); token=new V4GenesisLocalFixture(MARKETING); }
    function testExactGenesisAndAllDistinctReserves() public view {
        uint256[11] memory expected=[uint256(106666666560000),71111111040000,53333333280000,35555555520000,
            177777777600000,159999999840000,106666666560000,88888888800000,59111111052000,17777777760000,8888888880000];
        uint256 sum=token.balanceOf(MARKETING);
        require(sum==3111111108000 && token.decimals()==6 && token.marketingWallet()==MARKETING);
        for(uint256 i; i<11; ++i){
            address r=token.reserves(i);
            require(r.code.length>0 && r!=MARKETING && r!=address(token) && r!=address(this));
            require(V4ClosedReserveFixture(r).token()==address(token) && V4ClosedReserveFixture(r).reserveId()==i);
            require(token.reserveAmount(i)==expected[i] && token.balanceOf(r)==expected[i]);
            for(uint256 j; j<i; ++j)require(token.reserves(j)!=r);
            sum+=expected[i];
        }
        require(sum==888888888000000 && token.totalSupply()==sum);
        require(token.balanceOf(address(this))==0 && token.balanceOf(address(token))==0);
    }
    function testCommunityAndMarketingSubtotals() public view {
        uint256 community;
        for(uint256 i;i<4;++i)community+=token.balanceOf(token.reserves(i));
        require(community==266666666400000);
        require(token.balanceOf(token.reserves(8))+token.balanceOf(MARKETING)==62222222160000);
        require(token.MARKETING_INITIAL()*20==token.MARKETING_POOL());
    }
    function testRejectPublicChains() public {
        vm.chainId(84532);vm.expectRevert(V4GenesisLocalFixture.InvalidGenesis.selector);new V4GenesisLocalFixture(MARKETING);
        vm.chainId(8453);vm.expectRevert(V4GenesisLocalFixture.InvalidGenesis.selector);new V4GenesisLocalFixture(MARKETING);
    }
    function testRejectInvalidMarketingWallet() public {
        vm.expectRevert(V4GenesisLocalFixture.InvalidGenesis.selector);new V4GenesisLocalFixture(address(0));
        vm.expectRevert(V4GenesisLocalFixture.InvalidGenesis.selector);new V4GenesisLocalFixture(address(this));
        vm.expectRevert(V4GenesisLocalFixture.InvalidGenesis.selector);new V4GenesisLocalFixture(address(token));
        vm.expectRevert(V4GenesisLocalFixture.InvalidGenesis.selector);new V4GenesisLocalFixture(address(1));
    }
    function testRejectUnknownReserve() public {
        vm.expectRevert(V4GenesisLocalFixture.InvalidGenesis.selector);token.reserveAmount(11);
    }
    function testNoExternalMintOrGameClaim() public {
        (bool mintOk,)=address(token).call(abi.encodeWithSignature("mint(address,uint256)",MARKETING,1));
        (bool issueOk,)=address(token).call(abi.encodeWithSignature("issue(address[11])",new address[](11)));
        (bool claimOk,)=address(token).call(abi.encodeWithSignature("claim(address,uint256)",PAYEE,1));
        require(!mintOk&&!issueOk&&!claimOk&&token.totalSupply()==888888888000000);
    }
    function testSealedReserveCannotReleaseOrApprove() public {
        for(uint256 i;i<11;++i){
            address r=token.reserves(i);uint256 b=token.balanceOf(r);
            (bool ok,)=r.call(abi.encodeWithSignature("withdraw(address,uint256)",MARKETING,b));
            (bool approved,)=r.call(abi.encodeWithSignature("approve(address,uint256)",MARKETING,b));
            require(!ok&&!approved&&token.allowance(r,MARKETING)==0&&token.balanceOf(r)==b);
        }
        require(token.balanceOf(MARKETING)==3111111108000);
    }
    function testFuzz_TransferAndResaleWithoutTax(uint256 raw) public {
        uint256 a=raw%(token.MARKETING_INITIAL()+1);
        vm.prank(MARKETING);require(token.transfer(PAYEE,a));
        require(token.balanceOf(PAYEE)==a&&token.balanceOf(MARKETING)==token.MARKETING_INITIAL()-a);
        vm.prank(PAYEE);require(token.approve(MARKETING,a));
        vm.prank(MARKETING);require(token.transferFrom(PAYEE,MARKETING,a));
        require(token.balanceOf(PAYEE)==0&&token.balanceOf(MARKETING)==token.MARKETING_INITIAL());
        require(token.totalSupply()==888888888000000);
    }
    function testFuzz_HolderBurnCannotIncreaseSupply(uint256 raw) public {
        uint256 a=raw%(token.MARKETING_INITIAL()+1);
        vm.prank(MARKETING);token.burn(a);
        require(token.totalSupply()==888888888000000-a&&token.balanceOf(MARKETING)==token.MARKETING_INITIAL()-a);
        for(uint256 i;i<11;++i)require(token.balanceOf(token.reserves(i))==token.reserveAmount(i));
    }
}
