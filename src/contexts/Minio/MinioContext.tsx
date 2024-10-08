import { MinioStorageProvider } from "@/pages/ui/services/models/service";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  S3Client,
  ListBucketsCommand,
  Bucket,
  CreateBucketCommand,
  ListObjectsV2Command,
  ListObjectsV2CommandInput,
  CommonPrefix,
  _Object,
  DeleteBucketCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import getSystemConfigApi from "@/api/config/getSystemConfig";
import { alert } from "@/lib/alert";

export type MinioProviderData = {
  providerInfo: MinioStorageProvider;
  setProviderInfo: (providerInfo: MinioStorageProvider) => void;
  buckets: Bucket[];
  setBuckets: (buckets: Bucket[]) => void;
  createBucket: (bucketName: string) => Promise<void>;
  updateBuckets: () => Promise<void>;
  getBucketItems: (
    bucketName: string,
    path: string
  ) => Promise<{
    folders: CommonPrefix[];
    items: _Object[];
  }>;
  deleteBucket: (bucketName: string) => Promise<void>;
  createFolder: (bucketName: string, folderName: string) => Promise<void>;
  uploadFile: (bucketName: string, path: string, file: File) => Promise<void>;
  deleteFile: (bucketName: string, path: string) => Promise<void>;
};

export const MinioContext = createContext({} as MinioProviderData);

export const MinioProvider = ({ children }: { children: React.ReactNode }) => {
  const [providerInfo, setProviderInfo] = useState({} as MinioStorageProvider);
  const [buckets, setBuckets] = useState<Bucket[]>([]);

  const client = useMemo(() => {
    if (
      !providerInfo.endpoint ||
      !providerInfo.access_key ||
      !providerInfo.secret_key ||
      !providerInfo.region
    )
      return null;

    return new S3Client({
      region: providerInfo.region,
      endpoint: providerInfo.endpoint,
      credentials: {
        accessKeyId: providerInfo.access_key,
        secretAccessKey: providerInfo.secret_key,
      },
      forcePathStyle: true,
    });
  }, [providerInfo]);

  /**
   * Lista las carpetas e ítems en una ruta específica dentro de un bucket de S3.
   * @param bucketName Nombre del bucket de S3.
   * @param path Ruta dentro del bucket. Usa una cadena vacía para la raíz.
   * @returns Un objeto que contiene arrays de carpetas e ítems.
   */
  async function getBucketItems(
    bucketName: string,
    path: string = ""
  ): Promise<{
    folders: CommonPrefix[];
    items: _Object[];
  }> {
    if (!client) return { folders: [], items: [] };

    // Asegura que el prefijo termine con '/' si no está vacío
    const prefix = path ? (path.endsWith("/") ? path : `${path}/`) : "";

    const params: ListObjectsV2CommandInput = {
      Bucket: bucketName,
      Prefix: prefix,
      Delimiter: "/", // Usa '/' como delimitador para agrupar carpetas
    };

    try {
      const command = new ListObjectsV2Command(params);
      const response = await client.send(command);

      // Extrae las carpetas (CommonPrefixes)
      const folders = response.CommonPrefixes ?? [];

      // Extrae los ítems (Contents)
      const items =
        response.Contents?.filter((item) => item.Key !== prefix) ?? [];

      return { folders, items };
    } catch (error) {
      console.error("Error al listar objetos de S3:", error);
      throw error;
    }
  }

  useEffect(() => {
    async function getProviderInfo() {
      const config = await getSystemConfigApi();
      if (!config) return;

      setProviderInfo(config.minio_provider);
    }

    getProviderInfo();
  }, []);

  async function updateBuckets() {
    if (!client) return;

    const res = await client.send(new ListBucketsCommand({}));
    const buckets = res.Buckets;
    if (!buckets) return;

    setBuckets(buckets);
  }

  useEffect(() => {
    updateBuckets();
  }, [client]);

  async function createBucket(bucketName: string) {
    if (!client) return;

    try {
      const command = new CreateBucketCommand({
        Bucket: bucketName,
      });
      await client.send(command);
      alert.success("Bucket created successfully");
    } catch (error) {
      console.error(error);
      alert.error("Error creating bucket");
    }

    updateBuckets();
  }

  async function deleteBucket(bucketName: string) {
    if (!client) return;

    try {
      const command = new DeleteBucketCommand({ Bucket: bucketName });
      await client.send(command);
      alert.success("Bucket deleted successfully");
    } catch (error) {
      console.error(error);
      alert.error("Error deleting bucket");
    }

    updateBuckets();
  }

  async function createFolder(bucketName: string, folderName: string) {
    if (!client) return;

    const folderKey = folderName.endsWith("/") ? folderName : `${folderName}/`;

    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: folderKey,
        })
      );
      alert.success("Folder created successfully");
    } catch (error) {
      console.error(error);
      alert.error("Error creating folder");
    }

    updateBuckets();
  }

  async function uploadFile(
    bucketName: string,
    path: string,
    file: File
  ): Promise<void> {
    if (!client) return;

    const key = path ? `${path}${file.name}` : file.name;
    console.log(key);

    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: file,
      });
      await client.send(command);
      alert.success("File uploaded successfully");
    } catch (error) {
      console.error(error);
      alert.error("Error uploading file");
    }

    updateBuckets();
  }

  async function deleteFile(bucketName: string, path: string) {
    if (!client) return;

    try {
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: path,
      });
      await client.send(command);
      alert.success("File deleted successfully");
    } catch (error) {
      console.error(error);
      alert.error("Error deleting file");
    }

    updateBuckets();
  }

  return (
    <MinioContext.Provider
      value={{
        providerInfo,
        setProviderInfo,
        buckets,
        setBuckets,
        createBucket,
        createFolder,
        updateBuckets,
        getBucketItems,
        deleteBucket,
        uploadFile,
        deleteFile,
      }}
    >
      {children}
    </MinioContext.Provider>
  );
};

export const useMinio = () => useContext(MinioContext);
