import { useApiMutation } from "@/hooks/use-mutation";
import { useApiQuery } from "@/hooks/use-query";
import {
  Collection,
  CreateDocumentInput,
  UpdateDocumentInput,
} from "@/types/api";
import { useParams } from "react-router-dom";
import { AxiosRequestConfig } from "axios";

export const useDatabaseService = () => {
  const params = useParams();
  const projectId = params.projectId || "";

  // prepare request config with x-api-key when projectId exists
  const requestConfig: AxiosRequestConfig | undefined = projectId
    ? {
        headers: {
          "x-api-key": projectId,
        },
      }
    : undefined;

  // Get all collections for a project
  const useGetCollections = () =>
    useApiQuery<Collection[]>(`/api/db/collections`, {
      queryKey: ["fetchCollections", projectId],
      useCache: true,
      cacheKey: `collections-${projectId}`,
      enabled: !!projectId,
      requestConfig,
    });

  // Get all documents in a collection
  const useGetDocuments = (collectionName: string) =>
    useApiQuery<Document[]>(`/api/db/collections/${collectionName}/docs`, {
      queryKey: ["fetchDocuments", collectionName],
      cacheKey: `documents-${collectionName}`,
      enabled: !!collectionName,
      requestConfig,
    });

  // Create a new document
  const useCreateDocument = () =>
    useApiMutation<Document, CreateDocumentInput & { collectionName: string }>({
      method: "post",
      url: (variables) =>
        `/api/db/collections/${variables.collectionName}/docs`,
      invalidateQueries: ["fetchCollections", "fetchDocuments"],
      transformPayload: (variables) => ({
        id: variables.id,
        data: variables.data,
        metadata: variables.metadata,
      }),
      optimisticKey: "documents",
      optimisticData: (variables) => ({
        id: `temp-${Date.now()}`,
        collectionId: variables.collectionName,
        ...variables,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      // forward project header if available
      requestConfig,
    });

  // Get a document by ID
  const useGetDocument = (collectionName: string, docId: string) =>
    useApiQuery<Document>(
      `/api/db/collections/${collectionName}/docs/${docId}`,
      {
        queryKey: ["fetchDocument", collectionName, docId],
        useCache: true,
        cacheKey: `document-${collectionName}-${docId}`,
        enabled: !!collectionName && !!docId,
        requestConfig,
      }
    );

  // Update a document
  const useUpdateDocument = () =>
    useApiMutation<
      Document,
      UpdateDocumentInput & { collectionName: string; docId: string }
    >({
      method: "put",
      url: (variables) =>
        `/api/db/collections/${variables.collectionName}/docs/${variables.id}`,
      invalidateQueries: ["fetchCollections", "fetchDocuments"],
      transformPayload: (variables) => ({
        id: variables.id,
        data: variables.data,
        metadata: variables.metadata,
      }),
      optimisticKey: "document",
      optimisticData: (variables) => ({
        id: variables.docId,
        collectionId: variables.collectionName,
        ...variables,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      requestConfig,
    });

  // Delete a document
  const useDeleteDocument = () =>
    useApiMutation<void, { collectionName: string; docId: string }>({
      method: "delete",
      url: (variables) =>
        `/api/db/collections/${variables.collectionName}/docs/${variables.docId}`,
      invalidateQueries: [
        // Will be invalidated dynamically in the component
      ],
      requestConfig,
    });

  return {
    useGetCollections,
    useGetDocuments,
    useCreateDocument,
    useGetDocument,
    useUpdateDocument,
    useDeleteDocument,
  };
};
