-- Created by Vertabelo (http://vertabelo.com)
-- Last modification date: 2015-11-10 11:14:48.148



-- tables
-- Table: VERSION
CREATE TABLE VERSION (
    VERSIONID integer  NOT NULL  CONSTRAINT VERSION_pk  PRIMARY KEY
);

-- Table: blob
CREATE TABLE blob (
    blobID integer  NOT NULL  CONSTRAINT blob_pk  PRIMARY KEY,
    sha nvarchar(100)  NOT NULL
);

CREATE UNIQUE INDEX UX_blob_sha
ON blob (sha ASC)
;


-- Table: path
CREATE TABLE path (
    pathID integer  NOT NULL  CONSTRAINT path_pk  PRIMARY KEY,
    path nvarchar(256)  NOT NULL
);

CREATE UNIQUE INDEX UX_path_path
ON path (path ASC)
;


-- Table: pullrequest
CREATE TABLE pullrequest (
    pullrequestID integer  NOT NULL  CONSTRAINT pullrequest_pk  PRIMARY KEY,
    treeID int,
    state nvarchar(5)  NOT NULL,
    title nvarchar(250),
    repositoryName nvarchar(100),
    created datetime,
    updated datetime,
    FOREIGN KEY (treeID) REFERENCES tree (treeID)
);

-- Table: tree
CREATE TABLE tree (
    treeID integer  NOT NULL  CONSTRAINT tree_pk  PRIMARY KEY,
    sha nvarchar(100)  NOT NULL
);

CREATE UNIQUE INDEX UX_tree_sha
ON tree (sha ASC)
;


-- Table: treeBlob
CREATE TABLE treeBlob (
    treeBlobID integer  NOT NULL  CONSTRAINT treeBlob_pk  PRIMARY KEY,
    treeID int  NOT NULL,
    pathID int  NOT NULL,
    blobID int  NOT NULL,
    FOREIGN KEY (treeID) REFERENCES tree (treeID),
    FOREIGN KEY (pathID) REFERENCES path (pathID),
    FOREIGN KEY (blobID) REFERENCES blob (blobID)
);

CREATE INDEX IX_treeBlob_treeID
ON treeBlob (treeID ASC)
;


CREATE INDEX IX_treeBlob_pathid
ON treeBlob (pathID ASC)
;


CREATE INDEX IX_treeBlob_blobid
ON treeBlob (blobID ASC)
;

-- Table: tree
CREATE TABLE branch (
    branchID integer  NOT NULL  CONSTRAINT branch_pk  PRIMARY KEY,
    name nvarchar(100)  NOT NULL,
    treeID int  NOT NULL,
    FOREIGN KEY (treeID) REFERENCES tree (treeID)
);


CREATE UNIQUE INDEX UX_branch_name
ON branch (name ASC)
;





-- End of file.
