import {
  Address,
  Hex,
  bytesToBigInt,
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  erc20Abi,
  getContractAddress,
  hexToBigInt,
  keccak256,
  namehash,
  parseAbiParameters,
  toBytes,
  zeroAddress,
  zeroHash,
} from "viem";
import {
  FractalModuleAbi,
  FractalRegistryAbi,
  GnosisSafeL2Abi,
  GnosisSafeProxyFactoryAbi,
  ModuleProxyFactoryAbi,
  MultiSendCallOnlyAbi,
  PublicResolverAbi,
  RealityModuleETHAbi,
} from "./abis";
import { randomBytes } from "crypto";

export const createEnsTransaction = (
  ensPublicResolverAddress: Address,
  ensName: string,
  ensIPFSHash: string
) => {
  return {
    operation: 0,
    to: ensPublicResolverAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: PublicResolverAbi,
      functionName: "setText",
      args: [
        namehash(ensName), // bytes32 node,
        "daorequirements", // string key,
        `ipfs://${ensIPFSHash}`, // string value,
      ],
    }),
  };
};

export const createDeclareSubDaoTransaction = (
  fractalRegistryAddress: Address,
  subDaoAddress: Address
) => {
  return {
    operation: 0,
    to: fractalRegistryAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: FractalRegistryAbi,
      functionName: "declareSubDAO",
      args: [
        subDaoAddress, // address _subDAOAddress
      ],
    }),
  };
};

export const generateSaltNonce = () => {
  return bytesToBigInt(randomBytes(32));
};

export const salt = (initializer: Hex, saltNonce: bigint) => {
  return keccak256(
    encodePacked(["bytes", "uint256"], [keccak256(initializer), saltNonce])
  );
};

export const encodeMultiSend = (
  txs: { to: Address; value: bigint; data: Hex; operation: number }[]
): Hex => {
  return `0x${txs
    .map((tx) =>
      encodePacked(
        ["uint8", "address", "uint256", "uint256", "bytes"],
        [
          tx.operation,
          tx.to,
          tx.value,
          BigInt(toBytes(tx.data).length),
          tx.data,
        ]
      ).slice(2)
    )
    .join("")}`;
};

export const getGnosisSafeInitializer = (
  multisigOwners: Address[],
  multiSendCallOnlyAddress: Address,
  compatibilityFallbackHandlerAddress: Address
) => {
  return encodeFunctionData({
    abi: GnosisSafeL2Abi,
    functionName: "setup",
    args: [
      [...multisigOwners, multiSendCallOnlyAddress], // address[] _owners
      1n, // uint256 _threshold // hardcode to 1
      zeroAddress, // address to
      zeroHash, // bytes data
      compatibilityFallbackHandlerAddress, // address fallbackHandler
      zeroAddress, // address paymentToken
      0n, // uint256 payment
      zeroAddress, // address paymentReceiver
    ],
  });
};

export const getFractalModuleInitializer = (
  moduleOwner: Address,
  moduleAvatar: Address
) => {
  return encodeFunctionData({
    abi: FractalModuleAbi,
    functionName: "setUp",
    args: [
      encodeAbiParameters(
        parseAbiParameters("address, address, address, address[]"),
        [
          moduleOwner, // address _owner
          moduleAvatar, // address _avatar
          moduleAvatar, // address _target
          [], // address[] _controllers
        ]
      ),
    ],
  });
};

export const getRealityModuleInitializer = (
  moduleOwner: Address,
  moduleAvatar: Address,
  reality: {
    realityOracle: Address;
    realityTemplateId: bigint;
    realityMinimumBond: bigint;
    realityQuestionTimeout: number;
    realityQuestionCooldown: number;
    realityQuestionArbitrator: Address;
    realityAnswerExpiration: number;
  }
) => {
  return encodeFunctionData({
    abi: RealityModuleETHAbi,
    functionName: "setUp",
    args: [
      encodeAbiParameters(
        parseAbiParameters(
          "address, address, address, address, uint32, uint32, uint32, uint256, uint256, address"
        ),
        [
          moduleOwner, // address _owner
          moduleAvatar, // address _avatar
          moduleAvatar, // address _target
          reality.realityOracle, // RealitioV3 _oracle
          reality.realityQuestionTimeout, // uint32 timeout
          reality.realityQuestionCooldown, // uint32 cooldown
          reality.realityAnswerExpiration, // uint32 expiration
          reality.realityMinimumBond, // uint256 bond
          reality.realityTemplateId, // uint256 templateId
          reality.realityQuestionArbitrator, // address arbitrator
        ]
      ),
    ],
  });
};

export const getPredictedSafeAddress = (
  gnosisSafeProxyCreationCode: Hex,
  gnosisSafeProxyFactoryContractAddress: Address,
  gnosisSafeL2SingletonAddress: Address,
  salt: Hex
) => {
  return getContractAddress({
    bytecode: encodePacked(
      ["bytes", "uint256"],
      [gnosisSafeProxyCreationCode, hexToBigInt(gnosisSafeL2SingletonAddress)]
    ),
    from: gnosisSafeProxyFactoryContractAddress,
    opcode: "CREATE2",
    salt: salt,
  });
};

export const getPredictedModuleAddress = (
  moduleMasterCopyAddress: Address,
  moduleProxyFactoryAddress: Address,
  moduleInitializerData: Hex,
  saltNonce: bigint
) => {
  return getContractAddress({
    bytecode: `0x602d8060093d393df3363d3d373d3d3d363d73${moduleMasterCopyAddress.slice(
      2
    )}5af43d82803e903d91602b57fd5bf3`,
    from: moduleProxyFactoryAddress,
    opcode: "CREATE2",
    salt: salt(moduleInitializerData, saltNonce),
  });
};

export const createDeploySafeTransaction = (
  gnosisSafeProxyFactoryAddress: Address,
  gnosisSafeL2SingletonAddress: Address,
  gnosisSafeInitializer: Hex,
  saltNonce: bigint
) => {
  return {
    operation: 0,
    to: gnosisSafeProxyFactoryAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: GnosisSafeProxyFactoryAbi,
      functionName: "createProxyWithNonce",
      args: [
        gnosisSafeL2SingletonAddress, // address _singleton
        gnosisSafeInitializer, // bytes initializer
        saltNonce, // uint256 saltNonce
      ],
    }),
  };
};

export const createDeployModuleTransaction = (
  moduleProxyFactoryAddress: Address,
  moduleMasterCopyAddress: Address,
  moduleInitializer: Hex,
  saltNonce: bigint
) => {
  return {
    operation: 0,
    to: moduleProxyFactoryAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: ModuleProxyFactoryAbi,
      functionName: "deployModule",
      args: [
        moduleMasterCopyAddress, // address masterCopy
        moduleInitializer, // bytes initializer
        saltNonce, // uint256 saltNonce
      ],
    }),
  };
};

export const multiSendFunctionData = (
  multiSendTransactions: {
    to: Address;
    value: bigint;
    data: Hex;
    operation: number;
  }[]
) => {
  return encodeFunctionData({
    abi: MultiSendCallOnlyAbi,
    functionName: "multiSend",
    args: [
      encodeMultiSend(multiSendTransactions), // bytes transactions
    ],
  });
};

export const createMultiSendTransaction = (
  multiSendCallOnlyAddress: Address,
  delegateCall: boolean,
  multiSendTransactions: {
    operation: number;
    to: Address;
    value: bigint;
    data: Hex;
  }[]
) => {
  return {
    to: multiSendCallOnlyAddress,
    operation: delegateCall ? 1 : 0,
    value: 0n,
    data: multiSendFunctionData(multiSendTransactions),
  };
};

export const createSafeExecTransaction = (
  safeAddress: Address,
  target: Address,
  data: Hex
) => {
  return {
    operation: 0,
    to: safeAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: GnosisSafeL2Abi,
      functionName: "execTransaction",
      args: [
        target, // address to
        0n, // uint256 value
        data, // bytes data
        1, // uint8 operation
        0n, // uint256 safeTxGas
        0n, // uint256 baseGas
        0n, // uint256 gasPrice
        zeroAddress, // address gasToken
        zeroAddress, // address refundReceiver
        `0x000000000000000000000000${target.slice(
          2
        )}000000000000000000000000000000000000000000000000000000000000000001`, // bytes signatures
      ],
    }),
  };
};

export const createEnableModuleTransaction = (
  safeAddress: Address,
  predictedModuleAddress: Address
) => {
  return {
    operation: 0,
    to: safeAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: GnosisSafeL2Abi,
      functionName: "enableModule",
      args: [
        predictedModuleAddress, // address module
      ],
    }),
  };
};

export const createRemoveOwnerTransaction = (
  safeAddress: Address,
  ownerToRemove: Address,
  otherOwners: Address[],
  threshold: bigint
) => {
  return {
    operation: 0,
    to: safeAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: GnosisSafeL2Abi,
      functionName: "removeOwner",
      args: [
        otherOwners[otherOwners.length - 1], // address prevOwner
        ownerToRemove, // address owner
        threshold, // uint256 _threshold
      ],
    }),
  };
};

export const createUpdateDaoNameTransaction = (
  fractalRegistryAddress: Address,
  daoName: string
) => {
  return {
    operation: 0,
    to: fractalRegistryAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: FractalRegistryAbi,
      functionName: "updateDAOName",
      args: [
        daoName, // string _name
      ],
    }),
  };
};

export const createTransferTokensTransactions = (
  tokens: { address: Address; amount: bigint }[],
  recipient: Address
) => {
  return tokens.map((token) => ({
    operation: 0,
    to: token.address,
    value: 0n,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: [
        recipient, // address recipient
        token.amount, // uint256 amount
      ],
    }),
  }));
};
