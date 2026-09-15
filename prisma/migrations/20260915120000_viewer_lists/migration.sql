-- CreateTable
CREATE TABLE "ViewerBookmark" (
    "id" TEXT NOT NULL,
    "viewId" TEXT NOT NULL,
    "dataroomId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViewerBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViewerList" (
    "id" TEXT NOT NULL,
    "viewId" TEXT NOT NULL,
    "dataroomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViewerList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViewerListItem" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViewerListItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ViewerBookmark_viewId_documentId_key" ON "ViewerBookmark"("viewId", "documentId");

-- CreateIndex
CREATE INDEX "ViewerBookmark_viewId_idx" ON "ViewerBookmark"("viewId");

-- CreateIndex
CREATE INDEX "ViewerList_viewId_idx" ON "ViewerList"("viewId");

-- CreateIndex
CREATE UNIQUE INDEX "ViewerListItem_listId_documentId_key" ON "ViewerListItem"("listId", "documentId");

-- CreateIndex
CREATE INDEX "ViewerListItem_listId_idx" ON "ViewerListItem"("listId");

-- AddForeignKey
ALTER TABLE "ViewerBookmark" ADD CONSTRAINT "ViewerBookmark_viewId_fkey" FOREIGN KEY ("viewId") REFERENCES "View"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewerBookmark" ADD CONSTRAINT "ViewerBookmark_dataroomId_fkey" FOREIGN KEY ("dataroomId") REFERENCES "Dataroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewerBookmark" ADD CONSTRAINT "ViewerBookmark_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewerList" ADD CONSTRAINT "ViewerList_viewId_fkey" FOREIGN KEY ("viewId") REFERENCES "View"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewerList" ADD CONSTRAINT "ViewerList_dataroomId_fkey" FOREIGN KEY ("dataroomId") REFERENCES "Dataroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewerListItem" ADD CONSTRAINT "ViewerListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "ViewerList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewerListItem" ADD CONSTRAINT "ViewerListItem_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
