import clsx from "clsx";
import React from "react";
import styles from "./HomepageFeatures.module.css";

type FeatureItem = {
  title: string;
  image: string;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: "Distributed Computation",
    image: "",
    description: (
      <>
        No matter how big your project is, a distributed build system will be
        able to build it rapidly.
      </>
    ),
  },
  {
    title: "Focus on What Matters",
    image: "",
    description: (
      <>
        Focus on implementing your product, not on the details behind allowing
        fast builds.
      </>
    ),
  },
  {
    title: "Powered by Open Source",
    image: "",
    description: (
      <>
        Implemented with best in class open source systems, leveraging worldwide
        talent to make sure you can stay productive.
      </>
    ),
  },
];

function Feature({ title, image, description }: FeatureItem) {
  return (
    <div className={clsx("col col--4")}>
      <div className="text--center">
        {image != "" && (
          <img className={styles.featureSvg} alt={title} src={image} />
        )}
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
