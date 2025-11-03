import { useState } from "react";
import { ChevronRight, Plus, Eye, Edit, Trash2, FileText, Search, ChevronLeft, ChevronRight as ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CreateCollectionModal } from "./create-collection-modal";
import { AddDocumentModal } from "./add-document-modal";
import { EditDocumentModal } from "./edit-document-modal";
import { ViewDocumentModal } from "./view-document-modal";
import { useToast } from "@/hooks/use-toast";

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
  const [collections, setCollections] = useState<Collection[]>([
    {
      id: "users",
      name: "users",
      documentCount: 1247,
      lastUpdated: new Date(),
    },
    {
      id: "transactions",
      name: "transactions", 
      documentCount: 8934,
      lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      id: "contracts",
      name: "contracts",
      documentCount: 156,
      lastUpdated: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  ]);

  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: "doc1",
      data: {
        id: "user_123",
        address: "1A2B3C4D5E6F...",
        balance: "1000.50",
        lastActive: "2024-01-15T10:30:00Z",
        verified: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "doc2", 
      data: {
        id: "user_456",
        address: "7G8H9I0J1K2L...",
        balance: "2500.75",
        lastActive: "2024-01-14T15:45:00Z",
        verified: false,
      },
      createdAt: new Date(Date.now() - 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 30 * 60 * 1000),
    },
    {
      id: "doc3",
      data: {
        id: "user_789", 
        address: "3M4N5O6P7Q8R...",
        balance: "750.25",
        lastActive: "2024-01-13T09:15:00Z",
        verified: true,
      },
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 60 * 60 * 1000),
    },
  ]);

  // Pagination & Search
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const itemsPerPage = 10;

  // Modals
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [showEditDocument, setShowEditDocument] = useState(false);
  const [showViewDocument, setShowViewDocument] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  // Filtered & Paginated Documents
  const filteredDocuments = documents.filter(doc => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return JSON.stringify(doc.data).toLowerCase().includes(searchLower);
  });

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleCreateCollection = (name: string) => {
    const newCollection: Collection = {
      id: name.toLowerCase().replace(/\s+/g, '_'),
      name: name.toLowerCase().replace(/\s+/g, '_'),
      documentCount: 0,
      lastUpdated: new Date(),
    };
    setCollections([...collections, newCollection]);
    toast({
      title: "Collection created",
      description: `Collection "${name}" has been created successfully.`,
    });
  };

  const handleAddDocument = (data: Record<string, any>) => {
    const newDocument: Document = {
      id: `doc_${Date.now()}`,
      data: data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setDocuments([newDocument, ...documents]);
    
    // Update collection document count
    if (selectedCollection) {
      setCollections(collections.map(col => 
        col.id === selectedCollection.id 
          ? { ...col, documentCount: col.documentCount + 1, lastUpdated: new Date() }
          : col
      ));
      setSelectedCollection({ ...selectedCollection, documentCount: selectedCollection.documentCount + 1 });
    }

    toast({
      title: "Document added",
      description: "New document has been added to the collection.",
    });
  };

  const handleEditDocument = (docId: string, newData: Record<string, any>) => {
    setDocuments(documents.map(doc => 
      doc.id === docId 
        ? { ...doc, data: newData, updatedAt: new Date() }
        : doc
    ));

    if (selectedCollection) {
      setCollections(collections.map(col => 
        col.id === selectedCollection.id 
          ? { ...col, lastUpdated: new Date() }
          : col
      ));
    }

    toast({
      title: "Document updated",
      description: "Document has been updated successfully.",
    });
  };

  const handleDeleteDocument = (docId: string) => {
    setDocuments(documents.filter(doc => doc.id !== docId));
    
    // Update collection document count
    if (selectedCollection) {
      setCollections(collections.map(col => 
        col.id === selectedCollection.id 
          ? { ...col, documentCount: Math.max(0, col.documentCount - 1), lastUpdated: new Date() }
          : col
      ));
      setSelectedCollection({ ...selectedCollection, documentCount: Math.max(0, selectedCollection.documentCount - 1) });
    }

    toast({
      title: "Document deleted",
      description: "Document has been removed from the collection.",
    });
  };

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
              <h2 className="text-3xl font-bold mb-2">{selectedCollection.name}</h2>
              <p className="text-muted-foreground">
                {selectedCollection.documentCount} documents • Last updated {selectedCollection.lastUpdated.toLocaleDateString()}
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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search documents..."
            className="pl-10 transition-all duration-300 focus:shadow-glow"
          />
        </div>

        {/* Documents List */}
        {paginatedDocuments.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
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
            <Card key={document.id} className="hover:shadow-elevated transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-base">{document.data.id || document.id}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Created {document.createdAt.toLocaleString()}
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
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredDocuments.length)} of {filteredDocuments.length} documents
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
          onEditDocument={(data) => selectedDocument && handleEditDocument(selectedDocument.id, data)}
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
        {collections.map((collection) => (
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
                  <span className="text-sm text-muted-foreground">Documents</span>
                  <Badge variant="secondary">
                    {collection.documentCount.toLocaleString()}
                  </Badge>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  Last updated {collection.lastUpdated.toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {/* Add Collection Card */}
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