import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser = require("cookie-parser");
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api/v1");
  app.use(cookieParser());

  // Express does not trust X-Forwarded-For by default. In production, set this
  // to the exact number of trusted reverse-proxy hops (not `true`).
  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0 || trustProxyHops > 5) {
    throw new Error("TRUST_PROXY_HOPS must be an integer between 0 and 5");
  }
  app.getHttpAdapter().getInstance().set("trust proxy", trustProxyHops);

  app.enableCors({
    origin: process.env.WEB_ORIGIN || "http://localhost:3000",
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));
  const port = Number(process.env.PORT || 4000);
  await app.listen(port);
  console.log(`Nomadly API running at http://localhost:${port}/api/v1`);
}
bootstrap();
