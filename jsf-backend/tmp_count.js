const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.product.count().then(c=;return p.()});  
