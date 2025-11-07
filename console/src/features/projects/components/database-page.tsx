import { useState } from "react";
import {
  ChevronRight,
  Plus,
  Eye,
  Edit,
  Trash2,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CreateCollectionModal } from "./create-collection-modal";
import { AddDocumentModal } from "./add-document-modal";
import { EditDocumentModal } from "./edit-document-modal";
import { ViewDocumentModal } from "./view-document-modal";
import { useToast } from "@/hooks/use-toast";
import { useDatabaseService } from "@/lib/api/database.service";
import { useMemo } from "react";
import { v4 as uuidv4 } from "uuid";

interface Project {
  id: string;
  name: string;
  contractNodeAddress: string;
  contractHash: string;
  description?: string;
  createdAt: Date;
}

interface Collection {
  id: string;
  name: string;
  documentCount: number;
  lastUpdated: Date;
}

interface Document {
  id: string;
  data: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface DatabasePageProps {
  project: Project;
}

export function DatabasePage({ project }: DatabasePageProps) {
  const { toast } = useToast();
  const {
    useGetCollections,
    useGetDocuments,
    useCreateDocument,
    useUpdateDocument,
    useDeleteDocument,
  } = useDatabaseService();

  const collectionsQuery = useGetCollections();
  const collections: Collection[] = collectionsQuery.data ?? [];

  const [selectedCollection, setSelectedCollection] =
    useState<Collection | null>(null);

  // documents hook - enabled when collection selected (hook manages enabled internally)
  const selectedCollectionName = selectedCollection?.name ?? "";
  const documentsQuery = useGetDocuments(selectedCollectionName);
  const documents: Document[] = documentsQuery.data ?? [];

  // Pagination & Search
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const itemsPerPage = 10;

  // Modals
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [showEditDocument, setShowEditDocument] = useState(false);
  const [showViewDocument, setShowViewDocument] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null
  );

  const createDocMutation = useCreateDocument();
  const updateDocMutation = useUpdateDocument();
  const deleteDocMutation = useDeleteDocument();

  // Derived filtered & paginated documents
  const filteredDocuments = useMemo(() => {
    if (!documents || documents.length === 0) return [];

    // Filter out documents with empty data
    let filtered = documents.filter((doc) => {
      // Check if data is empty object or null/undefined
      if (!doc.data || Object.keys(doc.data).length === 0) {
        return false;
      }
      return true;
    });

    // Apply search filter if query exists
    if (!searchQuery) return filtered;
    const searchLower = searchQuery.toLowerCase();
    return filtered.filter((doc) =>
      JSON.stringify(doc.data).toLowerCase().includes(searchLower)
    );
  }, [documents, searchQuery]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredDocuments.length / itemsPerPage)
  );
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handlers
  const handleCreateCollection = async (name: string) => {
    try {
      // Create collection with an empty initial document
      const emptyDocId = uuidv4();
      await createDocMutation.mutateAsync({
        collectionName: name,
        id: emptyDocId,
        data: {}, // Empty document to initialize the collection
        metadata: {
          created_at: 0,
          updated_at: 0,
          version: 0,
          tags: [],
        },
      });

      toast({
        title: "Collection created",
        description: `Collection "${name}" has been created successfully with an initial document.`,
      });

      setSelectedCollection({
        id: `temp-${Date.now()}`,
        name,
        documentCount: 1,
        lastUpdated: new Date(),
      });
      setShowCreateCollection(false);
      // refetch collections if API exists
      collectionsQuery.refetch();
    } catch (err) {
      toast({
        title: "Failed to create collection",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleAddDocument = async (data: Record<string, any>, documentId?: string) => {
    if (!selectedCollection) return;
    try {
      // Use provided documentId if available, otherwise generate a new UUID
      const id = documentId || uuidv4();

      await createDocMutation.mutateAsync({
        collectionName: selectedCollection.name,
        id,
        data: { ...data },
        metadata: {
          created_at: 0,
          updated_at: 0,
          version: 0,
          tags: [],
        },
      });
      toast({
        title: "Document added",
        description: "New document has been added to the collection.",
      });
      setShowAddDocument(false);
    } catch (err) {
      toast({
        title: "Failed to add document",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleEditDocument = async (
    docId: string,
    newData: Record<string, any>,
    metadata: Record<string, any>
  ) => {
    if (!selectedCollection) return;
    try {
      await updateDocMutation.mutateAsync({
        collectionName: selectedCollection.name,
        id: docId,
        data: { ...newData },
        metadata,
      } as any);

      toast({
        title: "Document updated",
        description: "Document has been updated successfully.",
      });
      setShowEditDocument(false);
    } catch (err) {
      toast({
        title: "Failed to update",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!selectedCollection) return;
    try {
      await deleteDocMutation.mutateAsync({
        collectionName: selectedCollection.name,
        docId,
      } as any);
      await documentsQuery.refetch();
      await collectionsQuery.refetch();
      toast({
        title: "Document deleted",
        description: "Document has been removed from the collection.",
      });
    } catch (err) {
      toast({
        title: "Failed to delete",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  // UI: loading / error states
  const collectionsLoading = collectionsQuery.isLoading;
  const collectionsError = collectionsQuery.isError;

  const docsLoading = documentsQuery.isLoading;
  const docsError = documentsQuery.isError;

  if (selectedCollection) {
    return (
      <div className="p-6">
        {/* Collection Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-3">
            <button
              onClick={() => setSelectedCollection(null)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Collections
            </button>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{selectedCollection.name}</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">
                {selectedCollection.name}
              </h2>
              <p className="text-muted-foreground">
                {filteredDocuments.length} documents • Last updated{" "}
                {new Date(selectedCollection.lastUpdated).toLocaleDateString()}
              </p>
            </div>
            <Button
              onClick={() => setShowAddDocument(true)}
              className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Document
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search documents..."
            className="pl-10 transition-all duration-300 focus:shadow-glow"
            disabled={docsLoading}
          />
        </div>

        {/* Documents List */}
        {docsLoading ? (
          <Card className="text-center py-12">
            <CardContent>Loading documents…</CardContent>
          </Card>
        ) : paginatedDocuments.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? "No documents found" : "No documents yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "Try a different search query"
                  : "Add your first document to get started"}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => setShowAddDocument(true)}
                  className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Document
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-4">
              {paginatedDocuments.map((document) => (
                <Card
                  key={document.id}
                  className="hover:shadow-elevated transition-all duration-300"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 group/doc">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">
                              {document.data.id || document.id}
                            </CardTitle>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(document.data.id || document.id);
                                toast({
                                  title: "Copied",
                                  description: "Document ID copied to clipboard",
                                });
                              }}
                              className="opacity-0 group-hover/doc:opacity-100 transition-opacity duration-200 p-1 hover:bg-primary/10 rounded ml-1"
                              title="Copy document ID"
                            >
                              <svg
                                className="h-4 w-4 text-primary"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                              </svg>
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Created{" "}
                            {new Date(document.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedDocument(document);
                            setShowViewDocument(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedDocument(document);
                            setShowEditDocument(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteDocument(document.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="bg-console-bg border border-console-border rounded-lg p-4 font-mono text-sm">
                      <pre className="text-foreground overflow-x-auto">
                        {JSON.stringify(document.data, null, 2)}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(
                    currentPage * itemsPerPage,
                    filteredDocuments.length
                  )}{" "}
                  of {filteredDocuments.length} documents
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Modals */}
        <AddDocumentModal
          open={showAddDocument}
          onOpenChange={setShowAddDocument}
          onAddDocument={handleAddDocument}
          collectionName={selectedCollection.name}
        />

        <EditDocumentModal
          open={showEditDocument}
          onOpenChange={setShowEditDocument}
          onEditDocument={(data) =>
            selectedDocument &&
            handleEditDocument(
              selectedDocument.id,
              data,
              selectedDocument.metadata
            )
          }
          collectionName={selectedCollection.name}
          documentData={selectedDocument?.data || {}}
        />

        <ViewDocumentModal
          open={showViewDocument}
          onOpenChange={setShowViewDocument}
          documentData={selectedDocument?.data || {}}
          documentId={selectedDocument?.data.id || selectedDocument?.id || ""}
          collectionName={selectedCollection.name}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Collections</h2>
        <p className="text-muted-foreground">
          Manage your database collections and documents
        </p>
      </div>

      {/* Collections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {collectionsLoading ? (
          <Card className="text-center py-12">
            <CardContent>Loading collections…</CardContent>
          </Card>
        ) : collectionsError ? (
          <Card className="text-center py-12">
            <CardContent>Failed to load collections</CardContent>
          </Card>
        ) : collections.length === 0 ? (
          <Card className="col-span-3 text-center py-14">
            <CardContent>
              <h3 className="text-lg font-semibold mb-2">No collections yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first collection to get started.
              </p>
              <Button
                onClick={() => setShowCreateCollection(true)}
                className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Collection
              </Button>
            </CardContent>
          </Card>
        ) : (
          collections.map((collection) => (
            <Card
              key={collection.id}
              className="cursor-pointer transition-all duration-300 hover:shadow-elevated hover:scale-105 group"
              onClick={() => setSelectedCollection(collection)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-primary rounded-lg">
                      <FileText className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <CardTitle className="group-hover:text-primary transition-colors">
                        {collection.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Collection
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Documents
                    </span>
                    <Badge variant="secondary">
                      {collection.count.toLocaleString()}
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Last updated{" "}
                    {new Date(collection.last_updated).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {/* Add Collection Card */}
        {collections.length > 0 && (
          <Card
            className="border-dashed border-2 cursor-pointer transition-all duration-300 hover:shadow-elevated hover:scale-105 group"
            onClick={() => setShowCreateCollection(true)}
          >
            <CardContent className="flex items-center justify-center h-full p-8">
              <div className="text-center">
                <div className="p-3 bg-muted rounded-lg mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Plus className="h-6 w-6 mx-auto" />
                </div>
                <p className="font-medium group-hover:text-primary transition-colors">
                  Create Collection
                </p>
                <p className="text-xs text-muted-foreground">
                  Add a new data collection
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Collection Modal */}
      <CreateCollectionModal
        open={showCreateCollection}
        onOpenChange={setShowCreateCollection}
        onCreateCollection={handleCreateCollection}
      />
    </div>
  );
}
