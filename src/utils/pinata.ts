import axios from 'axios';

const PINATA_API_KEY = "ee7fd8b4670e8e75cf1f";
const PINATA_API_SECRET = "8765707d70f702f1da012ea6e52f345221d8a4c801acb5e7f8599760822577df";

export const uploadToPinata = async (
  file: File,
  metadata: Record<string, any>
): Promise<string> => {
  try {
    // First upload the image
    const formData = new FormData();
    formData.append('file', file);

    // Add pinata metadata for image with only simple key-values
    const pinataMetadata = JSON.stringify({
      name: metadata.name || 'Asset Image',
      keyvalues: {
        name: metadata.name || '',
        description: metadata.description || '',
        assetType: metadata.attributes?.[0]?.value || '',
        priceToken: metadata.attributes?.[1]?.value || '',
        earnXP: metadata.attributes?.[2]?.value || ''
      }
    });
    formData.append('pinataMetadata', pinataMetadata);

    // Upload image first
    const imageResponse = await axios({
      method: 'post',
      url: 'https://api.pinata.cloud/pinning/pinFileToIPFS',
      data: formData,
      maxBodyLength: Infinity,
      headers: {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_API_SECRET,
      },
    });

    const imageHash = imageResponse.data.IpfsHash;

    // Prepare metadata with image hash
    const metadataWithImage = {
      ...metadata,
      image: `ipfs://${imageHash}`,
    };

    // Upload metadata JSON directly using pinJSONToIPFS
    const jsonResponse = await axios({
      method: 'post',
      url: 'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      data: metadataWithImage,
      headers: {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_API_SECRET,
        'Content-Type': 'application/json',
      },
    });

    return jsonResponse.data.IpfsHash;
  } catch (error) {
    console.error('Error uploading to Pinata:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response:', error.response?.data);
      throw new Error(`Pinata upload failed: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
};

export const getIpfsUrl = (hash: string): string => {
  return `https://gateway.pinata.cloud/ipfs/${hash}`;
};

export const uploadJSONToPinata = async (jsonData: any): Promise<string> => {
  try {
    const response = await axios({
      method: 'post',
      url: 'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      data: jsonData,
      headers: {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_API_SECRET,
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ JSON uploaded to Pinata:', response.data.IpfsHash);
    return response.data.IpfsHash;
  } catch (error) {
    console.error('Error uploading JSON to Pinata:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response:', error.response?.data);
      throw new Error(`Pinata JSON upload failed: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
};