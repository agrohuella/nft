import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Metaplex, keypairIdentity, irysStorage, toMetaplexFile, toBigNumber } from "@metaplex-foundation/js";
import * as fs from 'fs';
import secret from './guideSecret.json';

const SOLANA_RPC = 'https://api.devnet.solana.com'; // 👈 Replace with your QuickNode Solana Devnet HTTP Endpoint
const SOLANA_CONNECTION = new Connection(SOLANA_RPC, { commitment: 'finalized' });
const WALLET = Keypair.fromSecretKey(new Uint8Array(secret));
const METAPLEX = Metaplex.make(SOLANA_CONNECTION)
    .use(keypairIdentity(WALLET))
    .use(irysStorage({
        address: 'https://devnet.irys.xyz',
        providerUrl: SOLANA_RPC,
        timeout: 60000,
    }));

const CONFIG = {
    uploadPath: 'uploads/',
    imgFileName: 'bulto.png',
    imgType: 'image/png',
    imgName: 'AgroHuella Logo',
    description: 'Empresa de trazabilidad de productos agropecuarios.',
    attributes: [
        {trait_type: 'Speed', value: 'Quick'},
        {trait_type: 'Type', value: 'Pixelated'},
        {trait_type: 'Background', value: 'QuickNode Blue'}
    ],
    sellerFeeBasisPoints: 500,//500 bp = 5%
    symbol: 'AHU',
    creators: [
        {address: WALLET.publicKey, share: 100}
    ]
};

async function uploadImage(filePath: string,fileName: string): Promise<string> {
    console.log(`Step 1 - Uploading Image`);
    const imgBuffer = fs.readFileSync(filePath+fileName);
    const imgMetaplexFile = toMetaplexFile(imgBuffer,fileName);
    const imgUri = await METAPLEX.storage().upload(imgMetaplexFile);
    console.log(`   Image URI:`,imgUri);
    return imgUri;
}

async function uploadMetadata(imgUri: string, imgType: string, nftName: string, description: string, attributes: {trait_type: string, value: string}[]): Promise<string> {
    console.log(`Step 2 - Uploading Metadata`);
    const { uri } = await METAPLEX
    .nfts()
    .uploadMetadata({
        name: nftName,
        description: description,
        image: imgUri,
        attributes: attributes,
        properties: {
            files: [
                {
                    type: imgType,
                    uri: imgUri,
                },
            ]
        }
    });
    console.log('   Metadata URI:',uri);
    return uri;
}

async function mintNft(metadataUri: string, name: string, sellerFee: number, symbol: string, creators: {address: PublicKey, share: number}[]): Promise<void> {
    console.log(`Step 3 - Minting NFT`);
    const { nft } = await METAPLEX
    .nfts()
    .create({
        uri: metadataUri,
        name: name,
        sellerFeeBasisPoints: sellerFee,
        symbol: symbol,
        creators: creators,
        isMutable: false,
    });
    console.log(`   Success!🎉`);
    console.log(`   Minted NFT: https://explorer.solana.com/address/${nft.address}?cluster=devnet`);
}

async function main() {
    console.log(`Minting ${CONFIG.imgName} to an NFT in Wallet ${WALLET.publicKey.toBase58()}.`);
    //Step 1 - Upload Image
    const imgUri = await uploadImage(CONFIG.uploadPath, CONFIG.imgFileName);
    //Step 2 - Upload Metadata
    const metadataUri = await uploadMetadata(imgUri, CONFIG.imgType, CONFIG.imgName, CONFIG.description, CONFIG.attributes);
    //Step 3 - Mint NFT
    await mintNft(metadataUri, CONFIG.imgName, CONFIG.sellerFeeBasisPoints, CONFIG.symbol, CONFIG.creators);
}

main();

